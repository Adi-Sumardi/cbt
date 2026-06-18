import { Injectable, Logger } from '@nestjs/common';
import { createHash } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Safe Exam Browser (SEB) integration — Config Key approach.
 *
 * Alur:
 *  1. buildSettings() = satu sumber kebenaran untuk file .seb DAN Config Key.
 *  2. buildPlist()    = render settings ke XML plist (.seb) yang dibuka SEB.
 *  3. computeConfigKey() = SHA256 dari JSON ter-normalisasi (algoritma resmi SEB).
 *  4. SEB mengirim header X-SafeExamBrowser-ConfigKeyHash = SHA256(URL + ConfigKey)
 *     pada tiap request → diverifikasi di verifyRequest().
 *
 * Ref: https://safeexambrowser.org/developer/seb-config-key.html
 */
@Injectable()
export class SebService {
  private readonly logger = new Logger(SebService.name);

  constructor(private readonly prisma: PrismaService) {}

  /** Base URL publik (domain diutamakan, fallback ke server URL/IP). */
  async getBaseUrl(): Promise<string> {
    const rows = await this.prisma.appSetting.findMany({
      where: { key: { in: ['domainUrl', 'serverUrl'] } },
    });
    const map: Record<string, string> = {};
    for (const r of rows) map[r.key] = r.value;
    return (map.domainUrl || map.serverUrl || '').replace(/\/+$/, '');
  }

  /** Mode strict: cocokkan hash kriptografis penuh (default false = aman dari lockout). */
  async isStrictHash(): Promise<boolean> {
    const row = await this.prisma.appSetting.findUnique({ where: { key: 'sebStrictHash' } });
    return row?.value === 'true' || row?.value === '1';
  }

  /** URL pertama yang dibuka SEB. */
  examStartUrl(base: string, accessCode: string): string {
    return `${base}/exam/join?code=${accessCode}`;
  }

  /** URL untuk keluar dari SEB setelah selesai. */
  quitUrl(base: string): string {
    return `${base}/auth/login`;
  }

  /**
   * Settings SEB — sumber tunggal untuk plist & Config Key.
   * Hanya berisi kunci yang kita set eksplisit; harus identik dengan isi .seb.
   */
  buildSettings(startUrl: string, quitUrl: string): Record<string, any> {
    return {
      startURL: startUrl,
      sendBrowserExamKey: true,
      quitURL: quitUrl,
      // Lockdown browser
      allowQuit: true,
      quitURLConfirm: true,
      allowReload: true,
      showReloadButton: true,
      showTime: true,
      showInputLanguage: false,
      enableZoomText: false,
      enableZoomPage: false,
      allowSpellCheck: false,
      allowDictionaryLookup: false,
      showMenuBar: false,
      showTaskBar: true,
      browserWindowAllowReload: true,
      newBrowserWindowByLinkPolicy: 0,
      newBrowserWindowByScriptPolicy: 0,
      enableBrowserWindowToolbar: false,
      hideBrowserWindowToolbar: true,
      // Larangan
      allowVirtualMachine: false,
      allowScreenSharing: false,
      enableScreenProctoring: false,
      allowWlan: false,
      allowAudioCapture: false,
      allowVideoCapture: false,
      // Clipboard / fitur OS
      enablePrivateClipboard: true,
      allowDisplayMirroring: false,
      allowedDisplaysMaxNumber: 1,
      // Keyboard / kunci sistem
      enableF1: false,
      enableF3: false,
      enableF12: false,
      enableEsc: false,
      enablePrintScreen: false,
      enableCtrlEsc: false,
      enableAltTab: false,
      enableAltEsc: false,
      enableRightMouse: false,
      enableAltMouseWheel: false,
    };
  }

  /**
   * Config Key = SHA256 dari JSON ter-normalisasi:
   *  - hapus key "originatorVersion"
   *  - urutkan key secara rekursif (case-insensitive)
   *  - JSON tanpa whitespace
   * Ref algoritma resmi SEB.
   */
  computeConfigKey(settings: Record<string, any>): string {
    const clone = JSON.parse(JSON.stringify(settings));
    delete clone.originatorVersion;
    const normalized = this.sortRecursive(clone);
    const json = JSON.stringify(normalized);
    return createHash('sha256').update(json, 'utf8').digest('hex');
  }

  /** Hash per-request: SHA256(URL + ConfigKey). */
  requestHash(fullUrl: string, configKey: string): string {
    return createHash('sha256').update(fullUrl + configKey, 'utf8').digest('hex');
  }

  private sortRecursive(value: any): any {
    if (Array.isArray(value)) return value.map((v) => this.sortRecursive(v));
    if (value && typeof value === 'object') {
      const sorted: Record<string, any> = {};
      for (const key of Object.keys(value).sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()))) {
        sorted[key] = this.sortRecursive(value[key]);
      }
      return sorted;
    }
    return value;
  }

  /** Render settings → XML plist (.seb). */
  buildPlist(settings: Record<string, any>): string {
    const body = this.plistDict(settings, 1);
    return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
${body}
</dict>
</plist>`;
  }

  private plistDict(obj: Record<string, any>, indent: number): string {
    const pad = '  '.repeat(indent);
    const lines: string[] = [];
    for (const key of Object.keys(obj)) {
      lines.push(`${pad}<key>${this.esc(key)}</key>`);
      lines.push(pad + this.plistValue(obj[key], indent));
    }
    return lines.join('\n');
  }

  private plistValue(value: any, indent: number): string {
    if (typeof value === 'boolean') return value ? '<true/>' : '<false/>';
    if (typeof value === 'number') {
      return Number.isInteger(value) ? `<integer>${value}</integer>` : `<real>${value}</real>`;
    }
    if (Array.isArray(value)) {
      const inner = value.map((v) => '  '.repeat(indent + 1) + this.plistValue(v, indent + 1)).join('\n');
      return `<array>\n${inner}\n${'  '.repeat(indent)}</array>`;
    }
    if (value && typeof value === 'object') {
      return `<dict>\n${this.plistDict(value, indent + 1)}\n${'  '.repeat(indent)}</dict>`;
    }
    return `<string>${this.esc(String(value))}</string>`;
  }

  private esc(s: string): string {
    return s
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  /**
   * Verifikasi request datang dari SEB asli dengan config yang benar.
   * Default (non-strict): wajib User-Agent SEB + header ConfigKeyHash ada
   *   (header ini mustahil dipalsukan dari browser biasa).
   * Strict: header hash harus sama dengan SHA256(fullUrl + configKey).
   */
  async verifyRequest(opts: {
    userAgent?: string;
    configKeyHash?: string;
    fullUrl: string;
    configKey: string;
  }): Promise<{ ok: boolean; reason?: string }> {
    const ua = opts.userAgent || '';
    if (!/\bSEB\b/i.test(ua) && !ua.includes('SEB')) {
      return { ok: false, reason: 'Bukan Safe Exam Browser' };
    }
    if (!opts.configKeyHash) {
      return { ok: false, reason: 'Header SEB tidak ditemukan' };
    }
    const expected = this.requestHash(opts.fullUrl, opts.configKey);
    if (opts.configKeyHash.toLowerCase() !== expected.toLowerCase()) {
      const strict = await this.isStrictHash();
      if (strict) {
        return { ok: false, reason: 'Config Key tidak cocok' };
      }
      this.logger.warn(
        `SEB ConfigKeyHash mismatch (non-strict, diizinkan). url=${opts.fullUrl} expected=${expected} got=${opts.configKeyHash}`,
      );
    }
    return { ok: true };
  }

  /** Bangun .seb + config key untuk sebuah exam access code. */
  async generateForExam(accessCode: string): Promise<{ plist: string; configKey: string; startUrl: string }> {
    const base = await this.getBaseUrl();
    const startUrl = this.examStartUrl(base, accessCode);
    const settings = this.buildSettings(startUrl, this.quitUrl(base));
    return {
      plist: this.buildPlist(settings),
      configKey: this.computeConfigKey(settings),
      startUrl,
    };
  }
}
