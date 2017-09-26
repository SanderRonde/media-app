import { Helpers, $ } from './helpers';

export class SuggestionBar {
	private readonly _searchBar: HTMLInputElement = null;
	private _currentSuggestions: Array<string> = [];
	private _selectedSuggestion: number = -1;
	private _originalInput: string = '';
	private _lastSearch: string = '';

	get searchBar() {
		return this._searchBar;
	}

	get lastSearch() {
		return this._lastSearch;
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
		Array.from($(`#${this.els.container}`).getElementsByClassName('suggestions')[0].children).forEach((child) => {
			child.classList.remove('selected');
		});
		if (index !== -1) {
			$(`#${this.els.container}`).getElementsByClassName('suggestions')[0].children.item(index).classList.add('selected');
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
		this.getRef().exec(query);
		this.hideSuggestions();
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
	}[], index: number): HTMLElement {
		const textElements = suggestion.map((suggestionPart) => {
			const { isSuggestion, value } = suggestionPart;
			const highlight = isSuggestion !== this.highlightCurrent
			return Helpers.el('span', highlight ? 
				'highlightedSuggestionPart' : '', value);
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

		const suggestions = await this._getSuggestions(value);
		const suggestionsContainer = $(`#${this.els.container}`).getElementsByClassName('suggestions')[0];
		Array.from(suggestionsContainer.children).forEach((child: HTMLElement) => {
			child.remove();
		});
		suggestions.map((suggestion, index) => {
			return this._genSuggestionElement(suggestion, index);
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
		const wasHidden = $(`#${this.els.container}`).classList.contains('suggestionsHidden')
		$(`#${this.els.container}`).classList.add('suggestionsHidden');
		return wasHidden;
	}

	private _showSuggestions() {
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

		$('#searchButton').addEventListener('click', (e) => {
			e.preventDefault();
			e.stopPropagation();
			this._doSearch(this._updateInputValue());
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