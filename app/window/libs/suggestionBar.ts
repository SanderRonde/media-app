import { Helpers, $ } from './helpers';

export class SuggestionBar {
	private readonly _searchBar: HTMLInputElement = null;
	private currentSuggestions: Array<string> = [];
	private selectedSuggestion: number = -1;
	private originalInput: string = '';
	private _lastSearch: string = '';

	get searchBar() {
		return this._searchBar;
	}

	get lastSearch() {
		return this._lastSearch;
	}

	private updateInputValue(): string {
		if (this.selectedSuggestion === -1) {
			if (this._searchBar.value !== this.originalInput) {
				this._searchBar.value = this.originalInput;
			}
			return this.originalInput;
		} else {
			this._searchBar.value = this.currentSuggestions[this.selectedSuggestion];
			return this.currentSuggestions[this.selectedSuggestion];
		}
	}

	private updateSelectedSuggestion(index: number): string {
		this.selectedSuggestion = index;
		Array.from($(`#${this.els.container}`).getElementsByClassName('suggestions')[0].children).forEach((child) => {
			child.classList.remove('selected');
		});
		if (index !== -1) {
			$(`#${this.els.container}`).getElementsByClassName('suggestions')[0].children.item(index).classList.add('selected');
		}
		return this.updateInputValue();
	}

	private async getSuggestions(query: string): Promise<{
		value: string;
		isSuggestion: boolean;
	}[][]> {
		if (query === '') {
			return [];	
		}

		return await this.getRef().getSuggestions(query);
	}

	private async doSearch(query: string) {
		this._lastSearch = query;
		this.getRef().exec(query);
		this.hideSuggestions();
	}

	private joinSuggestionParts(suggestionParts: {
		value: string;
		isSuggestion: boolean;
	}[]): string {
		return suggestionParts.map(suggestionPart => suggestionPart.value).join('');
	}

	private genSuggestionElement(suggestion: {
		value: string;
		isSuggestion: boolean;
	}[], index: number): HTMLElement {
		const textElements = suggestion.map((suggestionPart) => {
			const { isSuggestion, value } = suggestionPart;
			const highlight = isSuggestion !== this.highlightCurrent
			return Helpers.el('span', highlight ? 
				'highlightedSuggestionPart' : '', value);
		});

		const joinedSuggestion = this.joinSuggestionParts(suggestion);
		const container = Helpers.el('div', 'suggestion', textElements, {
			props: {
				tabindex: '-1'
			},
			listeners: {
				click: () => {
					this.updateSelectedSuggestion(index);
					this.doSearch(joinedSuggestion);		
				},
				keydown: (e: KeyboardEvent) => {
					if (e.key === ' ') {
						this.updateSelectedSuggestion(index);
						this.doSearch(joinedSuggestion);
					}
				}
			}
		})

		return container;
	}

	private async onKeyPress() {
		const value = this._searchBar.value;
		this.originalInput = value;

		const suggestions = await this.getSuggestions(value);
		const suggestionsContainer = $(`#${this.els.container}`).getElementsByClassName('suggestions')[0];
		Array.from(suggestionsContainer.children).forEach((child: HTMLElement) => {
			child.remove();
		});
		suggestions.map((suggestion, index) => {
			return this.genSuggestionElement(suggestion, index);
		}).forEach((suggestionElement) => {
			suggestionsContainer.appendChild(suggestionElement);
		});

		this.currentSuggestions = suggestions.map(this.joinSuggestionParts);
		this.showSuggestions();

		this.updateSelectedSuggestion(-1);

		if (this.currentSuggestions.length === 0) {
			this.hideSuggestions();
		}
	}

	public hideSuggestions(): boolean {
		const wasHidden = $(`#${this.els.container}`).classList.contains('suggestionsHidden')
		$(`#${this.els.container}`).classList.add('suggestionsHidden');
		return wasHidden;
	}

	private showSuggestions() {
		$(`#${this.els.container}`).classList.remove('suggestionsHidden');
	}

	async setup() {
		this._searchBar.addEventListener('keydown', async (e) => {
			if (e.key === 'Escape') {
				if (this.hideSuggestions()) {
					//Already was hidden, hide this bar in general
					this.getRef().hide();
				}
			} else if (e.key === ' ' && e.shiftKey) {
				this.showSuggestions();
				e.preventDefault();
				e.stopPropagation();
			} else if (e.key === 'ArrowDown') {
				if (this.selectedSuggestion === this.currentSuggestions.length - 1) {
					this.updateSelectedSuggestion(-1);
				} else {
					this.updateSelectedSuggestion(this.selectedSuggestion + 1);
				}
				this.updateInputValue();
				e.preventDefault();
				e.stopPropagation();
			} else if (e.key === 'ArrowUp') {
				if (this.selectedSuggestion > -1) {
					this.updateSelectedSuggestion(this.selectedSuggestion - 1);
				} else {
					this.updateSelectedSuggestion(this.currentSuggestions.length - 1);
				}
				this.updateInputValue();
				e.preventDefault();
				e.stopPropagation();
			} else if (e.key === 'ArrowLeft' || e.key === 'ArrowRight' || e.key === 'Enter') {
				//Don't update input
			} else {
				window.setTimeout(() => {
					this.onKeyPress();
				}, 1);
			}
		});

		$('#searchButton').addEventListener('click', (e) => {
			e.preventDefault();
			e.stopPropagation();
			this.doSearch(this.updateInputValue());
		});

		this.hideSuggestions();
	}

	focus(key: string = '') {
		this._searchBar.value = this._searchBar.value + key;
		this._searchBar.focus();
	}

	constructor(private els: {
		searchBarId: string;
		container: string;
	}, private getRef: () => {
		exec: (result: string) => void;
		hide: () => void;
		getSuggestions(query: string): Promise<{
			value: string;
			isSuggestion: boolean;
		}[][]>;
	}, private highlightCurrent: boolean = true) {
		this._searchBar = document.getElementById(els.searchBarId) as HTMLInputElement;
	}
}