export function playAudio(src: string) {
    try {
        new Audio(src).play();
    } catch {
        console.warn("Failed to play audio:", src);
    }
}