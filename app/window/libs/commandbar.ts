import { SuggestionBar } from './suggestionBar';

type SuggestionObj = {
	value: string;
	isFinal?: boolean;
	isSuggestion: boolean;
}[];

type SuggestionsArr = SuggestionObj[];

interface SuggestionGenerationBaseObj {
	arr: SuggestionObj;
	full: string;
	priority: number;
};

interface SuggestionGenerationAcronymObj extends SuggestionGenerationBaseObj {
	type: 'acronym';
	commandParts: {
		full: string;
		original: string[];
		lowercase: string[];
	};
	permutation: string[];
}

interface SuggestionGenerationContainsObj extends SuggestionGenerationBaseObj {
	type: 'contains';
}

type SuggestionGenerationObj = SuggestionGenerationAcronymObj|SuggestionGenerationContainsObj;

type SuggestionGenerationArr = SuggestionGenerationObj[];

enum PRIORITIES {
	ACRONYM = 2
}

export namespace Commands {
	export const commands = {
		'test': () => {}
	}
}

const MAX_SUGGESTIONS = 10;
const MAX_ACRONYM_SHORTCUT_LENGTH = 5;

export namespace CommandBar {
	const commandKeys: (keyof typeof Commands.commands)[] = Object.getOwnPropertyNames(Commands.commands) as any;
	const splitCommands = commandKeys.map((command) => {
		const split = command.split(' ');
		return {
			full: command,
			original: split,
			lowercase: split.map(e => e.toLowerCase())
		}
	});
	let lastAcronymSuggestions: SuggestionGenerationAcronymObj[] = [];	

	const suggestionBar = new SuggestionBar({
		searchBarId: 'commandBarInput',
		container: 'commandBarCentererContainer'
	}, () => {
		return {
			exec(result: string) {
				Commands.commands[result as keyof typeof Commands.commands]();
			},
			hide() {
				hide();
			},
			async getSuggestions(query: string): Promise<{
				value: string;
				isSuggestion: boolean;
			}[][]> {
				return new Promise<{
					value: string;
					isSuggestion: boolean;
				}[][]>((resolve) => {
					resolve(Suggestions.getSuggestions(query));
				});
			}
		}
	});
	const container = document.getElementById('commandBarCentererContainer');

	namespace Suggestions {
		function getCombinations(str: string): string[] {
			if (str.length > 1) {
				const results: string[] = [];
				const currentQueryCombinations = getCombinations(str.slice(0, -1));	
				currentQueryCombinations.forEach((currentQuery) => {
					results.push(currentQuery + str.slice(-1));
					results.push(currentQuery + ' ' + str.slice(-1));
					results.push(currentQuery);
				});
				return results;
			} else {
				return [str];
			}
		}

		function last<T>(arr: T[]): T {
			return arr[arr.length - 1];
		}

		function getUnchangedAcronymSuggestions(query: string): SuggestionGenerationAcronymObj[] {
			const unchangedSuggestions: SuggestionGenerationAcronymObj[] = [];

			//Check if any acronyms that were suggested before still are
			for (let i = 0; i < lastAcronymSuggestions.length; i++) {
				const { commandParts, permutation, arr, full } = lastAcronymSuggestions[i];
				const { lowercase, original } = commandParts;

				//Either there's supposed to be another part after the old acronym
				//aka Foo Bar ->Baz when search string is FBB
				//or it's the last part again
				//aka Foo BAr when search string is FBA
				const lastQueryLetter = query.slice(-1).toLowerCase();
				const noSpaceLastPerm = last(permutation) + lastQueryLetter;
				if (original.length > permutation.length &&
					lowercase[permutation.length].startsWith(lastQueryLetter)) {
						unchangedSuggestions.push({
							type: 'acronym',
							arr: arr.slice(0, -1).concat([{
								isSuggestion: false,
								value: lastQueryLetter
							}, {
								isSuggestion: true,
								value: lowercase[permutation.length].slice(1)
							}]),
							commandParts: commandParts,
							full: full,
							permutation: permutation.concat(lastQueryLetter),
							priority: PRIORITIES.ACRONYM
						});
						if (lowercase.length > permutation.length + 1) {
							last(unchangedSuggestions).arr.push({
								isSuggestion: true,
								isFinal: true,
								value: ' ' + lowercase.slice(permutation.length + 1).join(' ')
							});
						}
					} else if (last(lowercase).startsWith(noSpaceLastPerm)) {
						unchangedSuggestions.push({
							type: 'acronym',
							arr: (last(arr).isFinal ? arr.slice(0, -3) : arr.slice(0, -2)).concat([{
								isSuggestion: false,
								value: noSpaceLastPerm
							}, {
								isSuggestion: true,
								value: lowercase[permutation.length].slice(last(permutation).length + 1)
							}]),
							commandParts: commandParts,
							full: full,
							permutation: permutation.slice(0, -1).concat(noSpaceLastPerm),
							priority: PRIORITIES.ACRONYM
						});
						if (lowercase.length > permutation.length) {
							last(unchangedSuggestions).arr.push({
								isSuggestion: true,
								isFinal: true,
								value: ' ' + lowercase.slice(permutation.length).join(' ')
							});
						}
					}
			}

			return unchangedSuggestions;
		}

		function getAcronymSuggestions(query: string): SuggestionGenerationAcronymObj[] {
			if (query.length > MAX_ACRONYM_SHORTCUT_LENGTH) {
				const unchangedAcronymSuggestions = getUnchangedAcronymSuggestions(query);
				lastAcronymSuggestions = unchangedAcronymSuggestions;
				return unchangedAcronymSuggestions;
			}

			const suggestions: SuggestionGenerationAcronymObj[] = [];
			const combinations = getCombinations(query).map(combination => combination.split(' '));
			splitCommands.forEach((commandParts) => {
				combinations.forEach((combination) => {
					const { original, full, lowercase } = commandParts;
					const suggestion: SuggestionGenerationObj = {
						arr: [],
						full: full,
						priority: PRIORITIES.ACRONYM,
						type: 'acronym',
						commandParts: commandParts,
						permutation: combination
					};
					for (let i = 0; i < lowercase.length; i++) {
						if (!lowercase[i].startsWith(combination[i].toLowerCase())) {
							return;
						} else {
							suggestion.arr.push({
								isSuggestion: false,
								value: combination[i]
							});
							suggestion.arr.push({
								isSuggestion: true,
								value: original[i].slice(combination[i].length) + 
									((i === original.length - 1) ? '' : ' ')
							});
						}
					}
					if (lowercase.length > combination.length) {
						suggestion.arr.push({
							isSuggestion: true,
							isFinal: true,
							value: ' ' + lowercase.slice(combination.length).join(' ')
						});
					}
					suggestions.push(suggestion);
				});
			});
			lastAcronymSuggestions = suggestions;			
			return suggestions;
		}

		function getContainsSuggestions(query: string): SuggestionGenerationContainsObj[] {
			const suggestions: SuggestionGenerationContainsObj[] = [];

			commandKeys.forEach((commandKey) => {
				let index;
				if ((index = commandKey.toLowerCase().indexOf(query.toLowerCase())) > -1) {
					suggestions.push({
						arr: [{
							isSuggestion: true,
							value: commandKey.slice(0, index)
						}, {
							isSuggestion: false,
							value: query
						}, {
							isSuggestion: true,
							value: commandKey.slice(index + query.length)
						}],
						type: 'contains',
						full: commandKey,
						priority: index
					})
				}
			});

			return suggestions;
		}

		function cut<T>(arr: T[]): boolean {
			const isOverflow = arr.length >= MAX_SUGGESTIONS;
			if (!isOverflow) {
				return false;
			}

			while (arr.length > MAX_SUGGESTIONS) {
				arr.pop();
			}

			return true;
		}

		function filter(arr:SuggestionGenerationArr) {
			const fullOnly = arr.map(obj => obj.full.toLowerCase());

			for (let i = 0; i < fullOnly.length; i++) {
				if (fullOnly.indexOf(fullOnly[i]) !== i) {
					fullOnly.splice(i, 1);
					arr.splice(i, 1);
					i -= 1;
				}
			}
		}

		export function getSuggestions(query: string): SuggestionsArr {
			let suggestions: SuggestionGenerationArr = (getAcronymSuggestions(query) as SuggestionGenerationArr)
				.concat(getContainsSuggestions(query));
			filter(suggestions);
			cut(suggestions);
			const sortedSuggestions = suggestions.sort((a, b) => {
				return a.priority - b.priority;
			});
			return sortedSuggestions.map(obj => obj.arr);
		}
	}

	export function show() {
		container.classList.add('visible');
		suggestionBar.focus();
	}

	function hide() {
		container.classList.remove('visible');
	}

	export function setup() {
		suggestionBar.setup();
	}	
}