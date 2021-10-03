export const sample = <T>(arr: Array<T>) =>
	arr.sort((x) => 0.5 - Math.random())[0]
