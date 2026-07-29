import { validateScope } from '../guards/scope-guard';
import { DEFAULT_CONFIG } from '../guards/types';

describe('ScopeGuard — backend code detection', () => {
  test('blocks Express route handler in component output', () => {
    const result = validateScope('app.get("/users", handler)', 'component', DEFAULT_CONFIG);
    expect(result.blocked).toBe(true);
    expect(result.threats[0].type).toBe('scope_violation');
  });

  test('blocks SQL SELECT in page output', () => {
    const result = validateScope('SELECT * FROM users WHERE id = 1', 'page', DEFAULT_CONFIG);
    expect(result.blocked).toBe(true);
  });

  test('blocks SQL INSERT in config output', () => {
    const result = validateScope('INSERT INTO products VALUES (1, "test")', 'config', DEFAULT_CONFIG);
    expect(result.blocked).toBe(true);
  });

  test('blocks JWT sign in component', () => {
    const result = validateScope('jwt.sign({ id: user.id }, secret)', 'component', DEFAULT_CONFIG);
    expect(result.blocked).toBe(true);
  });

  test('blocks Terraform resource in style output', () => {
    const result = validateScope('aws_s3_bucket = "my-bucket"', 'style', DEFAULT_CONFIG);
    expect(result.blocked).toBe(true);
  });

  test('blocks bcrypt usage in any scope', () => {
    const result = validateScope('const hash = bcrypt.hashSync(password, 10)', 'component', DEFAULT_CONFIG);
    expect(result.blocked).toBe(true);
  });

  test('passes clean React component output', () => {
    const component = `
export default function ProductCard({ name, price }: { name: string; price: number }) {
  return (
    <div className="card">
      <h2>{name}</h2>
      <p>${'{'}price{'}'}</p>
    </div>
  );
}`;
    const result = validateScope(component, 'component', DEFAULT_CONFIG);
    expect(result.blocked).toBe(false);
    expect(result.passed).toBe(true);
  });

  test('passes clean CSS output for style scope', () => {
    const css = `.hero { background: linear-gradient(135deg, #001f3f, #0074D9); }`;
    const result = validateScope(css, 'style', DEFAULT_CONFIG);
    expect(result.blocked).toBe(false);
  });

  test('blocks JavaScript in style scope', () => {
    const malicious = `function steal() { fetch('/steal'); }`;
    const result = validateScope(malicious, 'style', DEFAULT_CONFIG);
    expect(result.blocked).toBe(true);
  });
});
