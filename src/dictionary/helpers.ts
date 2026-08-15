import { request, sanitizeHTMLToDom } from "obsidian";

// ============ Types ============

export interface DictSearchResult<Result> {
    result: Result;
    audio?: { uk?: string; us?: string; py?: string };
}

export interface GetSrcPageFunction {
    (text: string): string;
}

export interface SearchFunction<Result> {
    (text: string, config?: any): Promise<DictSearchResult<Result>>;
}

export type HTMLString = string;

// ============ HTTP helpers ============

export async function fetchDirtyDOM(url: string, config?: any): Promise<DocumentFragment> {
    const param: any = { url, method: "GET" };
    if (config?.cookies) {
        const cookie = Object.keys(config.cookies)
            .map(name => `${name}=${config.cookies[name]}`)
            .join("; ");
        param.headers = {
            "cookie": cookie,
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) obsidian/1.0.3 Chrome/100.0.4896.160 Electron/18.3.5 Safari/537.36"
        };
    }
    const response = await request(param);
    const cleaned = response.replace(/<img.+?>/g, "");
    return sanitizeHTMLToDom(cleaned);
}

// ============ DOM helpers ============

export function getText(parent: ParentNode | null, selector?: string): string {
    if (!parent) return '';
    const child = selector ? parent.querySelector(selector) : (parent as HTMLElement);
    if (!child) return '';
    return child.textContent || '';
}

export function getInnerHTML(host: string, parent: ParentNode, selectorOrConfig: any = {}): string {
    const selector = typeof selectorOrConfig === 'string' ? selectorOrConfig : selectorOrConfig.selector;
    const node = selector ? parent.querySelector<HTMLElement>(selector) : (parent as HTMLElement);
    if (!node) return '';
    return node.innerHTML || '';
}

export function getFullLink(host: string, el: Element, attr: string): string {
    if (host.endsWith('/')) host = host.slice(0, -1);
    const protocol = host.startsWith('https') ? 'https:' : 'http:';
    const link = el.getAttribute(attr);
    if (!link) return '';
    if (/^[a-zA-Z0-9]+:/.test(link)) return link;
    if (link.startsWith('//')) return protocol + link;
    if (/^.?\/+/.test(link)) return host + '/' + link.replace(/^.?\/+/, '');
    return host + '/' + link;
}

export function handleNoResult<T = any>(): Promise<T> {
    return Promise.reject(new Error('NO_RESULT'));
}

export function handleNetWorkError(): Promise<never> {
    return Promise.reject(new Error('NETWORK_ERROR'));
}

export function removeChild(parent: ParentNode, selector: string) {
    const child = parent.querySelector(selector);
    if (child) child.remove();
}

export function removeChildren(parent: ParentNode, selector: string) {
    parent.querySelectorAll(selector).forEach(el => el.remove());
}

export function isTagName(node: Node, tagName: string): boolean {
    return ((node as HTMLElement).tagName || '').toLowerCase() === tagName.toLowerCase();
}

export const getStaticSpeaker = (src?: string | null) => {
    if (!src) return '';
    const $a = document.createElement('a');
    $a.target = '_blank';
    $a.href = src;
    $a.className = 'speaker';
    return $a;
};