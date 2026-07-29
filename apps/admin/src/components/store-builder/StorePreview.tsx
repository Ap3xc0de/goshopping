interface PartialStoreConfig {
  name?: string;
  style?: string;
  colors?: { primary?: string; secondary?: string; accent?: string };
}

interface StorePreviewProps {
  storeConfig?: PartialStoreConfig;
  loading?: boolean;
}

function hslToHex(hsl: string): string {
  const parts = hsl.split(' ');
  if (parts.length !== 3) return '#3b82f6';
  const h = parseFloat(parts[0]);
  const s = parseFloat(parts[1]) / 100;
  const l = parseFloat(parts[2]) / 100;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color)
      .toString(16)
      .padStart(2, '0');
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

const FONT_MAP: Record<string, { heading: string; body: string }> = {
  minimal: { heading: 'Inter', body: 'Inter' },
  vibrant: { heading: 'Poppins', body: 'Inter' },
  elegant: { heading: 'Cormorant Garamond', body: 'Lato' },
  urban: { heading: 'Space Grotesk', body: 'Space Grotesk' },
  fresh: { heading: 'Nunito', body: 'Nunito' },
};

export function StorePreview({ storeConfig, loading }: StorePreviewProps) {
  const primaryColor = storeConfig?.colors?.primary
    ? hslToHex(storeConfig.colors.primary)
    : '#3b82f6';
  const secondaryColor = storeConfig?.colors?.secondary
    ? hslToHex(storeConfig.colors.secondary)
    : '#f8fafc';
  const storeName = storeConfig?.name || 'Tu Tienda';
  const style = storeConfig?.style || 'minimal';
  const fonts = FONT_MAP[style] ?? FONT_MAP.minimal;

  return (
    <div
      className="w-full h-full min-h-[400px] rounded-xl border border-gray-200 overflow-hidden bg-white flex flex-col"
      data-testid="store-preview"
    >
      {/* Browser chrome */}
      <div className="flex items-center gap-1.5 px-3 py-2 bg-gray-100 border-b border-gray-200 flex-shrink-0">
        <div className="w-2.5 h-2.5 rounded-full bg-red-400" />
        <div className="w-2.5 h-2.5 rounded-full bg-yellow-400" />
        <div className="w-2.5 h-2.5 rounded-full bg-green-400" />
        <div className="ml-2 flex-1 bg-white text-xs text-gray-400 rounded px-2 py-0.5 truncate">
          preview.goshopping.com
        </div>
      </div>

      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="w-8 h-8 border-2 border-brand-700 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            <p className="text-sm text-gray-400">Generando preview...</p>
          </div>
        </div>
      ) : (
        <div className="flex-1 overflow-auto" style={{ fontFamily: fonts.body }}>
          {/* Navbar */}
          <nav
            className="flex items-center justify-between px-6 py-3 border-b border-gray-100"
            style={{ backgroundColor: primaryColor }}
          >
            <span
              className="font-bold text-lg text-white truncate"
              style={{ fontFamily: fonts.heading }}
            >
              {storeName}
            </span>
            <div className="flex gap-4 text-sm text-white/80">
              <span>Inicio</span>
              <span>Catálogo</span>
            </div>
          </nav>

          {/* Hero */}
          <div
            className="px-6 py-10 text-center"
            style={{ backgroundColor: secondaryColor }}
          >
            <h1
              className="text-2xl font-bold mb-2"
              style={{ color: primaryColor, fontFamily: fonts.heading }}
            >
              {storeName}
            </h1>
            <p className="text-sm text-gray-500 mb-5">Bienvenido a nuestra tienda</p>
            <button
              className="text-sm font-medium text-white px-5 py-2 rounded-full"
              style={{ backgroundColor: primaryColor }}
            >
              Ver catálogo
            </button>
          </div>

          {/* Mock product grid */}
          <div className="px-6 py-4">
            <p className="text-xs text-gray-400 mb-3 font-medium uppercase tracking-wider">
              Productos destacados
            </p>
            <div className="grid grid-cols-3 gap-2">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="rounded-lg overflow-hidden border border-gray-100 shadow-sm"
                >
                  <div
                    className="h-16 opacity-20"
                    style={{ backgroundColor: primaryColor }}
                  />
                  <div className="p-2">
                    <div className="h-2 bg-gray-200 rounded mb-1" />
                    <div className="h-2 bg-gray-100 rounded w-2/3" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
