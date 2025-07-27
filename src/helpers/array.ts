export function findClosestIndex(arr: number[], target: number) {
    let index = 0;
    for (let i = 1; i < arr.length; i++) {

        // update the result if we find a closer element.
        if (Math.abs(arr[i] - target) <= Math.abs(arr[index] - target)) {
            index = i;
        }
    }
    return index;
}