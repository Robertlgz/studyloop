import { watch } from "vue";

type Emit = (event: "loading", status: { id: string; loading: boolean; result: boolean }) => void;

export function useLoading(
    watchee: () => any,
    id: string,
    search: () => Promise<boolean>,
    emit: Emit,
) {
    watch(
        watchee,
        async () => {
            emit("loading", { id, loading: true, result: false });
            try {
                emit("loading", { id, loading: false, result: await search() });
            } catch {
                emit("loading", { id, loading: false, result: false });
            }
        },
        { immediate: true },
    );
}