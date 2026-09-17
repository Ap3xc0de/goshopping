package models

import (
	"fmt"
	"net/url"
	"path"
	"regexp"
	"strconv"
	"strings"
)

// StoreBranding is the store's visual identity, persisted as a subdocument
// under the "branding" key inside stores.config (see Store.Config).
type StoreBranding struct {
	BrandName   string            `json:"brand_name,omitempty"`
	Tagline     string            `json:"tagline,omitempty"`
	LogoURL     string            `json:"logo_url,omitempty"`
	FaviconURL  string            `json:"favicon_url,omitempty"`
	Colors      BrandColors       `json:"colors,omitempty"`
	Fonts       BrandFonts        `json:"fonts,omitempty"`
	Radius      string            `json:"radius,omitempty"` // "sm"|"md"|"lg"|"xl"
	SocialLinks map[string]string `json:"social_links,omitempty"`
}

// BrandColors holds HSL color overrides in "H S% L%" format (no hsl() wrapper).
// Empty = use the default from the storefront's TemplateConfig for that field.
type BrandColors struct {
	Primary             string `json:"primary,omitempty"`
	PrimaryForeground   string `json:"primary_foreground,omitempty"`
	Secondary           string `json:"secondary,omitempty"`
	SecondaryForeground string `json:"secondary_foreground,omitempty"`
	Accent              string `json:"accent,omitempty"`
	AccentForeground    string `json:"accent_foreground,omitempty"`
	Background          string `json:"background,omitempty"`
	Foreground          string `json:"foreground,omitempty"`
	Muted               string `json:"muted,omitempty"`
	// NavBackground/NavText style the storefront's Navbar independently of
	// the other colors — the user asked for a dedicated header color that
	// does not silently reuse secondary/background semantics (design
	// decision 9).
	NavBackground string `json:"nav_background,omitempty"`
	NavText       string `json:"nav_text,omitempty"`
}

// BrandFonts holds Google Font family names for headings and body text.
type BrandFonts struct {
	Heading string `json:"heading,omitempty"`
	Body    string `json:"body,omitempty"`
}

// AllowedFonts is the font whitelist. It mirrors FONT_VAR_MAP in
// apps/storefront/src/lib/template-css.ts (the fonts used by the 5 storefront
// templates), plus Poppins/Outfit for the GoCart template — this map is the
// backend's source of truth counterpart to that frontend font list.
var AllowedFonts = map[string]bool{
	"Inter":              true,
	"Playfair Display":   true,
	"Space Grotesk":      true,
	"Cormorant Garamond": true,
	"Lora":               true,
	"Bebas Neue":         true,
	"DM Sans":            true,
	"Nunito":             true,
	"Nunito Sans":        true,
	"Poppins":            true,
	"Outfit":             true,
}

// hslRe matches "H S% L%" triplets; the 0-360 / 0-100 numeric ranges are
// checked separately since a regex alone can't bound digit values.
var hslRe = regexp.MustCompile(`^(\d{1,3}) (\d{1,3})% (\d{1,3})%$`)

// FieldError is a single field-scoped validation failure.
type FieldError struct {
	Field   string
	Message string
}

// ValidationErrors aggregates every field-level failure found by Validate so
// callers can report all problems at once instead of stopping at the first.
type ValidationErrors []FieldError

func (v ValidationErrors) Error() string {
	parts := make([]string, len(v))
	for i, fe := range v {
		parts[i] = fmt.Sprintf("%s: %s", fe.Field, fe.Message)
	}
	return strings.Join(parts, "; ")
}

// Validate checks every branding field and returns a ValidationErrors
// aggregating all problems found, or nil if the branding is valid.
// allowedAssetPrefix is the exact scheme+host+path prefix that logo_url and
// favicon_url must fall under (the store's own S3 bucket/prefix). It is
// compared via net/url host equality plus a cleaned-path prefix check —
// never via strings.Contains — so a host lookalike (e.g. a query string
// containing the real bucket name) cannot bypass the check.
func (b *StoreBranding) Validate(allowedAssetPrefix string) error {
	var errs ValidationErrors

	colorFields := []struct{ name, value string }{
		{"colors.primary", b.Colors.Primary},
		{"colors.primary_foreground", b.Colors.PrimaryForeground},
		{"colors.secondary", b.Colors.Secondary},
		{"colors.secondary_foreground", b.Colors.SecondaryForeground},
		{"colors.accent", b.Colors.Accent},
		{"colors.accent_foreground", b.Colors.AccentForeground},
		{"colors.background", b.Colors.Background},
		{"colors.foreground", b.Colors.Foreground},
		{"colors.muted", b.Colors.Muted},
		{"colors.nav_background", b.Colors.NavBackground},
		{"colors.nav_text", b.Colors.NavText},
	}
	for _, f := range colorFields {
		if f.value == "" {
			continue
		}
		if msg := validateHSL(f.value); msg != "" {
			errs = append(errs, FieldError{Field: f.name, Message: msg})
		}
	}

	if b.Fonts.Heading != "" && !AllowedFonts[b.Fonts.Heading] {
		errs = append(errs, FieldError{Field: "fonts.heading", Message: "font not in allowed list"})
	}
	if b.Fonts.Body != "" && !AllowedFonts[b.Fonts.Body] {
		errs = append(errs, FieldError{Field: "fonts.body", Message: "font not in allowed list"})
	}

	if b.LogoURL != "" {
		if msg := validateAssetURL(b.LogoURL, allowedAssetPrefix); msg != "" {
			errs = append(errs, FieldError{Field: "logo_url", Message: msg})
		}
	}
	if b.FaviconURL != "" {
		if msg := validateAssetURL(b.FaviconURL, allowedAssetPrefix); msg != "" {
			errs = append(errs, FieldError{Field: "favicon_url", Message: msg})
		}
	}

	if len(errs) == 0 {
		return nil
	}
	return errs
}

// validateHSL returns an empty string if value matches "H S% L%" with H in
// 0-360 and S,L in 0-100, otherwise a human-readable validation message.
func validateHSL(value string) string {
	m := hslRe.FindStringSubmatch(value)
	if m == nil {
		return `must match format "H S% L%" (e.g. "142 71% 45%")`
	}
	h, _ := strconv.Atoi(m[1])
	s, _ := strconv.Atoi(m[2])
	l, _ := strconv.Atoi(m[3])
	if h > 360 {
		return "hue must be between 0 and 360"
	}
	if s > 100 {
		return "saturation must be between 0 and 100"
	}
	if l > 100 {
		return "lightness must be between 0 and 100"
	}
	return ""
}

// validateAssetURL returns an empty string if rawURL's scheme+host match
// allowedPrefix exactly and its cleaned path falls under allowedPrefix's
// path, otherwise a human-readable validation message.
func validateAssetURL(rawURL, allowedPrefix string) string {
	if allowedPrefix == "" {
		return "asset uploads are not configured for this store"
	}
	target, err := url.Parse(rawURL)
	if err != nil || target.Host == "" || target.Scheme == "" {
		return "must be an absolute URL"
	}
	allowed, err := url.Parse(allowedPrefix)
	if err != nil {
		return "invalid store asset prefix configuration"
	}
	if !strings.EqualFold(target.Scheme, allowed.Scheme) || !strings.EqualFold(target.Host, allowed.Host) {
		return "must point to this store's own asset bucket"
	}
	targetPath := path.Clean("/" + target.Path)
	allowedPath := path.Clean("/" + allowed.Path)
	if targetPath != allowedPath && !strings.HasPrefix(targetPath, allowedPath+"/") {
		return "must point to this store's own asset prefix"
	}
	return ""
}
