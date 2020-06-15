export interface EpubLocation {
    startCfi: string,
    endCfi: string,
    page: number,
    chapter: EpubChapter
}

export interface EpubChapter {
    cfi: string,
    href: string,
    label: string,
    spinePos: number
}

export interface EpubPage {
    cfi: string,
    page: number
}

export interface EpubSearchResult {
    cfi: string,
    excerpt: string
}

export interface EpubMetadata {
    bookTitle: string,
    creator: string,
    description: string,
    direction: any,
    identifier: string,
    language: string,
    layout: string,
    modified_date: string,
    orientation: string,
    pubdate: string,
    publisher: string,
    rights: string,
    spread: string
}

export enum EpubError {
    OPEN_FILE,
    READ_FILE,
    NOT_LOADED_DOCUMENT,
    NOT_DISPLAYED_CHAPTER,
    SEARCH,
    COMPUTE_PAGINATION,
    LOAD_METADATA,
    LOAD_TOC
}