import { DictionaryEngine, EngineResult } from "../engine";
import { getInnerHTML, handleNoResult, handleNetWorkError, fetchDirtyDOM, getStaticSpeaker } from "../helpers";

const langMap: Record<string, string> = { en: "w", jp: "jp/jc", kr: "kr", fr: "fr", de: "de", es: "es" };

export const HjdictEngine: DictionaryEngine = {
    id: "hjdict",
    name: "Hujiang",
    description: "English, Japanese, Korean, French, etc.",
    requiresApiKey: false,

    async search(text: string): Promise<EngineResult> {
        const cookies: Record<string, any> = {
            HJ_SITEID: 3, HJ_UID: getUUID(), HJ_SID: getUUID(), HJ_SSID: getUUID(),
            HJID: 0, HJ_VT: 3, HJ_SST: 1, HJ_CSST: 1, HJ_ST: 1, HJ_CST: 1, HJ_T: +new Date(), _: getUUID(16),
        };
        return fetchDirtyDOM(
            `https://dict.hujiang.com/w/${encodeURIComponent(text)}`,
            { cookies },
        )
            .catch(handleNetWorkError)
            .then(doc => handleDOM(doc, text))
            .catch(handleNoResult);
    },
};

function handleDOM(doc: DocumentFragment, word: string): EngineResult {
    if (doc.querySelector('.word-notfound')) {
        throw new Error('NO_RESULT');
    }

    const result: EngineResult = {
        title: word,
        meaningHTML: "",
        translationHTML: "",
        prons: [],
    };

    // 发音
    doc.querySelectorAll<HTMLSpanElement>('.word-audio').forEach($audio => {
        $audio.replaceWith(getStaticSpeaker($audio.dataset.src));
    });

    // 释义
    const entries: string[] = [];
    doc.querySelectorAll('.word-details-pane').forEach(($pane, i) => {
        const content = getInnerHTML("", $pane, { selector: '.word-details-pane-content' });
        if (content) entries.push(content);
    });
    result.meaningHTML = entries.join("\n");

    // 建议词形
    const $suggests = doc.querySelector('.word-suggestions');
    if ($suggests) {
        result.suggestions = getInnerHTML("", $suggests);
    }

    return result;
}

function getUUID(e?: number | string): string {
    let t = arguments.length > 1 ? arguments[1] : 16;
    let n = '';
    if (typeof e === 'number') {
        for (let i = 0; i < e; i++) n += Math.floor(10 * Math.random()) % 2 === 0 ? 'x' : 'y';
    } else {
        n = (e as string) || 'xxxxxxxx-xyxx-yxxx-xxxy-xxyxxxxxxxxx';
    }
    return n.replace(/[xy]/g, function (c) {
        const r = (Math.random() * 16) | 0;
        return (c === 'x' ? r : (3 & r) | 8).toString(16);
    });
}