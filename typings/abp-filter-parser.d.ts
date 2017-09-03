declare module 'abp-filter-parser' {
	export interface FilterData {
		bloomFilter: any;
		exceptionBloomFilter: any;
		filters: any[];
		noFingerprintFilters: any[];
		exceptionFilters: any[];
		htmlRuleFilters: any[];
	}	

	export function parse(rules: string, output: Partial<FilterData>): void;
	
	export function matches(filterData: Partial<FilterData>, url: string, options: {
		domain: string;
		elementTypeMaskMap: elementTypes
	}): boolean;

	export enum elementTypes {
		SCRIPT,
		IMAGE,
		STYLESHEET,
		OBJECT,
		XMLHTTPREQUEST,
		OBJECTSUBREQUEST,
		SUBDOCUMENT,
		DOCUMENT,
		OTHER
	}
}