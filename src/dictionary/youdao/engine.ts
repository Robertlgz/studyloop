import { DictionaryEngine, EngineResult, CollinsEntry } from "../engine";
import { getText, getInnerHTML, handleNoResult, handleNetWorkError, fetchDirtyDOM, removeChild, HTMLString } from "../helpers";

export const YoudaoEngine: DictionaryEngine = {
    id: "youdao",
    name: "Youdao",
    description: "English <=> Chinese",
    requiresApiKey: false,

    async search(text: string): Promise<EngineResult> {
        return fetchDirtyDOM(`https://dict.youdao.com/w/${encodeURIComponent(text.replace(/\s+/g, ' '))}`)
            .catch(handleNetWorkError)
            .then(doc => checkResult(doc, text))
            .catch(handleNoResult);
    },
};

function checkResult(doc: DocumentFragment, word: string): Promise<EngineResult> {
    const $typo = doc.querySelector('.error-typo');
    if (!$typo) {
        return handleDOM(doc, word);
    }
    return handleNoResult();
}

function handleDOM(doc: DocumentFragment, word: string): EngineResult {
    const result: EngineResult = {
        title: getText(doc, '.keyword') || word,
        meaningHTML: "",
        translationHTML: "",
        prons: [],
        collins: [],
    };

    // 发音
    doc.querySelectorAll('.baav .pronounce').forEach($pron => {
        const phsym = $pron.textContent || '';
        const $voice = $pron.querySelector<HTMLAnchorElement>('.dictvoice');
        if ($voice && $voice.dataset.rel) {
            const url = 'https://dict.youdao.com/dictvoice?audio=' + $voice.dataset.rel;
            result.prons.push({ phsym, url });
        }
    });

    // 释义
    result.meaningHTML = getInnerHTML("", doc, { selector: '#phrsListTab .trans-container' });

    // 翻译
    result.translationHTML = getInnerHTML("", doc, { selector: '#fanyiToggle .trans-container' });

    // 柯林斯
    const collins: CollinsEntry[] = [];
    doc.querySelectorAll('#collinsResult .wt-container').forEach($container => {
        const item: CollinsEntry = { title: '', content: '' };
        const $title = $container.querySelector(':scope > .title.trans-tip');
        if ($title) {
            removeChild($title, '.do-detail');
            item.title = getText($title);
            $title.remove();
        }
        item.content = getInnerHTML("", $container);
        if (item.content) collins.push(item);
    });
    result.collins = collins;

    // 辨析
    doc.querySelectorAll("#discriminate .wt-container .title a").forEach(el => el.remove());
    result.discriminationHTML = getInnerHTML("", doc, { selector: '#discriminate' });

    // 词组
    result.wordGroupHTML = getInnerHTML("", doc, { selector: '#wordGroup' });

    // 同根词
    result.relWordHTML = getInnerHTML("", doc, { selector: '#relWordTab' });

    return result;
}