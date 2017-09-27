import { Helpers, $ } from './helpers';

export class SuggestionBar {
	private readonly _searchBar: HTMLInputElement = null;
	private _currentSuggestions: Array<string> = [];
	private _selectedSuggestion: number = -1;
	private _originalInput: string = '';
	private _lastSearch: string = '';

	private _mode: 'search'|'input'|'enum' = 'search';
	private _searchPromise: {
		resolve(value: string): void;
		promise: Promise<string>;
	} = null;
	private _enum: string[] = null;

	get searchBar() {
		return this._searchBar;
	}

	get lastSearch() {
		return this._lastSearch;
	}

	private async _getArg(arg: {
		name: string;
		enum?: string[];
	}): Promise<string> {
		this._mode = arg.enum ? 'enum' : 'input';
		this.searchBar.setAttribute('placeholder', arg.name);
		this._resetSearchBar();
		const promise = new Promise<string>((resolve) => {
			this._searchPromise = {
				resolve: resolve,
				promise: promise
			}
		});
		const result = await promise;
		this._mode = 'search';
		this._searchPromise = null;
		return result;
	}

	public async getArgs(argDescriptors: {
		name: string;
		enum?: string[]
	}[]): Promise<string[]> {
		if (argDescriptors.length === 0) {
			return [];
		}
		const args: string[] = [];
		for (let i = 0; i < argDescriptors.length; i++) {
			const arg = await this._getArg(argDescriptors[i]);
			if (arg === null) {
				return [];
			}
			args.push(arg);
		}
		this._reset();
		return args;
	}

	private _updateInputValue(): string {
		if (this._selectedSuggestion === -1) {
			if (this._searchBar.value !== this._originalInput) {
				this._searchBar.value = this._originalInput;
			}
			return this._originalInput;
		} else {
			this._searchBar.value = this._currentSuggestions[this._selectedSuggestion];
			return this._currentSuggestions[this._selectedSuggestion];
		}
	}

	private _updateSelectedSuggestion(index: number): string {
		this._selectedSuggestion = index;
		Array.from($(`#${this.config.container}`).getElementsByClassName('suggestions')[0].children).forEach((child) => {
			child.classList.remove('selected');
		});
		if (index !== -1) {
			$(`#${this.config.container}`).getElementsByClassName('suggestions')[0].children.item(index).classList.add('selected');
		}
		return this._updateInputValue();
	}

	private async _getSuggestions(query: string): Promise<{
		value: string;
		isSuggestion: boolean;
	}[][]> {
		if (query === '') {
			return [];	
		}

		return await this.getRef().getSuggestions(query);
	}

	private async _doSearch(query: string) {
		this._lastSearch = query;
		this.hideSuggestions();
		this.getRef().exec(query, this.getArgs);
	}

	private _joinSuggestionParts(suggestionParts: {
		value: string;
		isSuggestion: boolean;
	}[]): string {
		return suggestionParts.map(suggestionPart => suggestionPart.value).join('');
	}

	private _genSuggestionElement(suggestion: {
		value: string;
		isSuggestion: boolean;
	}[], index: number, original: string): HTMLElement {
		let strIndex = 0;
		const textElements = suggestion.map((suggestionPart) => {
			const { isSuggestion, value } = suggestionPart;
			const highlight = isSuggestion !== this.highlightCurrent
			const element = Helpers.el('span', highlight ? 
				'highlightedSuggestionPart' : '', original.slice(strIndex, value.length));
			strIndex += value.length;
			return element;
		});

		const joinedSuggestion = this._joinSuggestionParts(suggestion);
		const container = Helpers.el('div', 'suggestion', textElements, {
			props: {
				tabindex: '-1'
			},
			listeners: {
				click: () => {
					this._updateSelectedSuggestion(index);
					this._doSearch(joinedSuggestion);		
				},
				keydown: (e: KeyboardEvent) => {
					if (e.key === ' ') {
						this._updateSelectedSuggestion(index);
						this._doSearch(joinedSuggestion);
					}
				}
			}
		})

		return container;
	}

	private async _onKeyPress() {
		const value = this._searchBar.value;
		this._originalInput = value;

		const suggestions = this._mode === 'enum' ?
			this._enum.map((option) => {
				if (option.indexOf(value) > -1) {
					return [{
						isSuggestion: true,
						value: option.slice(0, option.indexOf(value))
					}, {
						isSuggestion: false,
						value: value
					}, {
						isSuggestion: true,
						value: option.slice(option.indexOf(value) + value.length)
					}]
				} else {
					return null;
				}
			}).filter(val => val) :  await this._getSuggestions(value);
		const suggestionsContainer = $(`#${this.config.container}`).getElementsByClassName('suggestions')[0];
		Array.from(suggestionsContainer.children).forEach((child: HTMLElement) => {
			child.remove();
		});
		suggestions.map((suggestion, index) => {
			return this._genSuggestionElement(suggestion, index, value);
		}).forEach((suggestionElement) => {
			suggestionsContainer.appendChild(suggestionElement);
		});

		this._currentSuggestions = suggestions.map(this._joinSuggestionParts);
		this._showSuggestions();

		this._updateSelectedSuggestion(-1);

		if (this._currentSuggestions.length === 0) {
			this.hideSuggestions();
		}
	}

	public hideSuggestions(): boolean {
		const wasHidden = $(`#${this.config.container}`).classList.contains('suggestionsHidden')
		$(`#${this.config.container}`).classList.add('suggestionsHidden');
		return wasHidden;
	}

	private _showSuggestions() {
		$(`#${this.config.container}`).classList.remove('suggestionsHidden');
	}

	private _resetSearchBar() {
		this._searchBar.value = '';
	}

	private _reset() {
		this._resetSearchBar();
		this._currentSuggestions = [];
		this._selectedSuggestion = -1;
		this._originalInput = '';
		this._searchBar.setAttribute('placeholder', this.config.placeholder);
		this._mode = 'search';

		if (this._searchPromise) {
			this._searchPromise.resolve(null);
		}
		this._searchPromise = null;
	}

	private _submit() {
		if (this._mode === 'search') {
			this._doSearch(this._updateInputValue());
		} else if (this._mode === 'input') {
			if (this._searchPromise) {
				this._searchPromise.resolve(this._updateInputValue());
			}
		} else if (this._mode === 'enum') {
			if (this._searchPromise && this._enum.indexOf(this._updateInputValue()) > -1) {
				this._searchPromise.resolve(this._updateInputValue());
			}
		}
	}

	async setup() {
		this._searchBar.addEventListener('keydown', async (e) => {
			if (e.key === 'Escape') {
				if (this.hideSuggestions()) {
					//Already was hidden, hide this bar in general
					this.getRef().hide();

					this._reset();
				}
			} else if (!this.config.searchButton && e.key === 'Enter') {
				e.preventDefault();
				e.stopPropagation();
				this._submit();
			}
			if (this._mode === 'input') {
				return;
			}
			if (e.key === ' ' && e.shiftKey) {
				this._showSuggestions();
				e.preventDefault();
				e.stopPropagation();
			} else if (e.key === 'ArrowDown') {
				if (this._selectedSuggestion === this._currentSuggestions.length - 1) {
					this._updateSelectedSuggestion(-1);
				} else {
					this._updateSelectedSuggestion(this._selectedSuggestion + 1);
				}
				this._updateInputValue();
				e.preventDefault();
				e.stopPropagation();
			} else if (e.key === 'ArrowUp') {
				if (this._selectedSuggestion > -1) {
					this._updateSelectedSuggestion(this._selectedSuggestion - 1);
				} else {
					this._updateSelectedSuggestion(this._currentSuggestions.length - 1);
				}
				this._updateInputValue();
				e.preventDefault();
				e.stopPropagation();
			} else if (e.key === 'ArrowLeft' || e.key === 'ArrowRight' || e.key === 'Enter') {
				//Don't update input
			} else {
				window.setTimeout(() => {
					this._onKeyPress();
				}, 1);
			}
		});

		if (this.config.searchButton) {
			$(this.config.searchButton).addEventListener('click', (e) => {
				e.preventDefault();
				e.stopPropagation();
				this._submit();
			});
		}

		this.hideSuggestions();
	}

	focus(key: string = '') {
		this._searchBar.value = this._searchBar.value + key;
		this._searchBar.focus();
	}

	constructor(private config: {
		searchBarId: string;
		container: string;
		searchButton?: string;
		placeholder: string;
	}, private getRef: () => {
		exec: (result: string, getArgs: (names: {
			name: string;
			enum?: string[]
		}[]) => Promise<string[]>) => void;
		hide: () => void;
		getSuggestions(query: string): Promise<{
			value: string;
			isSuggestion: boolean;
		}[][]>;
	}, private highlightCurrent: boolean = true) {
		this._searchBar = document.getElementById(config.searchBarId) as HTMLInputElement;
	}
}