export const sleep = (time: number) =>
	new Promise((resolve) => setTimeout(resolve, time))

export const runSequential = (
	funcs: (<ReturnType, ArgumentTypes = unknown>(
		args?: ArgumentTypes
	) => Promise<ReturnType | unknown | void>)[]
) =>
	funcs.reduce(
		(promise, f) =>
			promise.then(
				(result) => f().then(Array.prototype.concat.bind(result)) // Sequentially resolve
			),
		Promise.resolve([]) // Initial value
	)
