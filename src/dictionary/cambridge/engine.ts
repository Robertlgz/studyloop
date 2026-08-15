import { DictionaryEngine, EngineResult } from "../engine";
import { getInnerHTML, handleNoResult, handleNetWorkError, fetchDirtyDOM, getStaticSpeaker } from "../helpers";

export const CambridgeEngine: DictionaryEngine = {
    id: "cambridge",
    name: "Cambridge",
    description: "English => Chinese",
    requiresApiKey: false,

    async search(text: string): Promise<EngineResult> {
        return fetchDirtyDOM(`https://dictionary.cambridge.org/dictionary/english-chinese-simplified/${encodeURIComponent(text)}`)
            .catch(handleNetWorkError)
            .then(doc => handleDOM(doc, text))
            .catch(handleNoResult);
    },
};

function handleDOM(doc: DocumentFragment, word: string): EngineResult {
    const result: EngineResult = {
        title: word,
        meaningHTML: "",
        translationHTML: "",
        prons: [],
    };

    // 发音
    doc.querySelectorAll('.pronounce .us').forEach($el => {
        const $audio = $el.querySelector('source[src]');
        if ($audio) {
            const url = $audio.getAttribute('src') || '';
            const phsym = $el.textContent?.trim() || '';
            result.prons.push({ phsym, url: url.startsWith('//') ? 'https:' + url : url });
        }
    });
    doc.querySelectorAll('.pronounce .uk').forEach($el => {
        const $audio = $el.querySelector('source[src]');
        if ($audio) {
            const url = $audio.getAttribute('src') || '';
            const phsym = $el.textContent?.trim() || '';
            result.prons.push({ phsym, url: url.startsWith('//') ? 'https:' + url : url });
        }
    });

    // 释义
    const $senseBlocks = doc.querySelectorAll('.pr.entry-body__el .pr.dictionary');
    let meaningHtml = '';
    $senseBlocks.forEach(($block, i) => {
        const $pos = $block.querySelector('.posgram .pos');
        const $def = $block.querySelector('.def');
        const $examples = $block.querySelectorAll('.examp');
        if ($pos && $def) {
            meaningHtml += `<div class="cambridge-sense">`;
            meaningHtml += `<span class="pos">${$pos.textContent}</span> `;
            meaningHtml += `<span class="def">${$def.textContent}</span>`;
            $examples.forEach(($ex) => {
                meaningHtml += `<div class="example">${$ex.textContent}</div>`;
            });
            meaningHtml += `</div>`;
        }
    });
    result.meaningHTML = meaningHtml;

    // 翻译块
    result.translationHTML = getInnerHTML("", doc, { selector: '.trans.dtrans' });

    // 替换 speaker 图标
    doc.querySelectorAll('audio').forEach($audio => {
        const src = $audio.getAttribute('src');
        if (src) {
            $audio.replaceWith(getStaticSpeaker(src));
        }
    });

    return result;
}