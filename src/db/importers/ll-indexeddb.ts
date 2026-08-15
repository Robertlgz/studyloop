// LL IndexedDB 导入器
// 从旧 Language Learner 插件的 IndexedDB 导入词库

import type { Word } from "@/db/word-store";
import type StudyLoop from "@/main";

/** 打开旧 LL 的 IndexedDB */
function openOldDB(dbName: string): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
        const req = indexedDB.open(dbName);
        req.onerror = () => reject(new Error("Failed to open old LL database"));
        req.onsuccess = () => resolve(req.result);
    });
}

/** 读取旧 LL 的 expressions 表 */
async function readExpressions(db: IDBDatabase): Promise<any[]> {
    const tx = db.transaction("expressions", "readonly");
    const store = tx.objectStore("expressions");
    return new Promise((resolve, reject) => {
        const req = store.getAll();
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(new Error("Failed to read expressions"));
    });
}

/** 读取旧 LL 的 sentences 表 */
async function readSentences(db: IDBDatabase): Promise<any[]> {
    const tx = db.transaction("sentences", "readonly");
    const store = tx.objectStore("sentences");
    return new Promise((resolve, reject) => {
        const req = store.getAll();
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(new Error("Failed to read sentences"));
    });
}

/** 从 LL IndexedDB 导入到 StudyLoop 词库 */
export async function importFromLL(plugin: StudyLoop, dbName: string = "WordDB"): Promise<number> {
    let count = 0;
    try {
        const db = await openOldDB(dbName);
        const expressions = await readExpressions(db);
        const sentences = await readSentences(db);

        const sentenceMap = new Map<number, any>();
        for (const s of sentences) {
            sentenceMap.set(s.id, s);
        }

        for (const expr of expressions) {
            if (expr.status === 0) continue; // 跳过忽略词

            const word: Word = {
                expression: expr.expression.toLowerCase(),
                meaning: expr.meaning || "",
                phonetic: "",
                pos: "",
                status: expr.status || 1,
                t: expr.t === "PHRASE" ? "PHRASE" : "WORD",
                language: "en",
                tags: [...(expr.tags || [])],
                notes: expr.notes || [],
                sentences: (expr.sentences || [])
                    .map((id: number) => sentenceMap.get(id))
                    .filter(Boolean)
                    .map((s: any) => ({ text: s.text, trans: s.trans || "", origin: s.origin || "" })),
                date: expr.date || Math.floor(Date.now() / 1000),
                mastery: expr.status || 1,
                mdLink: null,
                exposures: 0,
                lastExposure: null,
                exposureHistory: [],
                fsrs: {
                    due: new Date().toISOString().split("T")[0],
                    stability: 0, difficulty: 0, state: 0,
                    reps: 0, lapses: 0, lastReview: null,
                },
                ankiNoteId: null,
            };

            plugin.wordStore.addWord(word);
            count++;
        }

        db.close();
    } catch (e) {
        console.error("LL import failed:", e);
        throw e;
    }
    return count;
}