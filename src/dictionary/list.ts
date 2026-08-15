import { DictionaryEngine, EngineResult } from "./engine";
import { YoudaoEngine } from "./youdao/engine";
import { CambridgeEngine } from "./cambridge/engine";
import { HjdictEngine } from "./hjdict/engine";
import { DeepLEngine } from "./deepl/engine";
import { AiEngine } from "./ai/engine";
import { FreeEngine } from "./free/engine";

const engines: DictionaryEngine[] = [
    YoudaoEngine,
    CambridgeEngine,
    HjdictEngine,
    DeepLEngine,
    AiEngine,
    FreeEngine,
];

// 按优先级排序（settings 里配置）
export function getEngines(enabledIds: string[]): DictionaryEngine[] {
    const active = engines.filter(e => enabledIds.includes(e.id));
    // 按 settings 里的优先级排序
    return active;
}

// 按优先级依次查，第一个返回 lex 结果的胜出
export async function searchAll(
    word: string,
    enabledIds: string[],
    config?: any,
): Promise<{ engine: DictionaryEngine; result: EngineResult } | null> {
    for (const engine of getEngines(enabledIds)) {
        try {
            const result = await engine.search(word, config);
            if (result && result.meaningHTML) {
                // 第一个有释义的引擎胜出
                return { engine, result };
            }
        } catch {
            continue;
        }
    }
    return null;
}

export { engines };