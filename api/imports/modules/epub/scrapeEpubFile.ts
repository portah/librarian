import { TfIdf, PorterStemmer, AggressiveTokenizer } from 'natural';

import { Publisher } from '../publishers';
import { Book, Books } from '/imports/api/books';
import { EPUB } from './epub';

import { ScrapeFile, stopWords } from '../pdf/scrapePdfFile';

import { Logger } from '../logger';




export class ScrapeEpubFile extends ScrapeFile {

    constructor(protected epubData: any, protected fileInfo: any, protected publishers?: Publisher[]) {
        super(fileInfo, publishers);

    }
    /**
     * Get the most out of the PDF file
     * @param epubData - from epub parser
     * @param fileInfo - file data from fs stats
     * @param publishers - list of publishers {title: string, url: string}
     */
    scrapeEpubFile() {
        const epubData = this.epubData;
        const fileInfo = this.fileInfo;

        let title = '';
        let description = '';
        let creator = '';
        let authors: string[] = [];

        if (epubData.metadata && epubData.metadata.title) {
            title = epubData.metadata.title;
        }
        if (epubData.metadata.description) {
            description = epubData.metadata.description;
        }
        if (epubData.metadata.creator) {
            creator = epubData.metadata.creator;
            authors = creator.split(/;/);
        }

        // const fileNameTokenized = this.aggressiveTokenizer.tokenize(fileInfo.name);

        const publisher: Publisher | undefined = this.publisher(epubData.metadata.publisher);
        const isbn = this.isbn();

        if (!title) {
            title = this.fileNameTokenized.join(' ');
        }


        const epubBook: Book = {} as Book;
        epubBook.title = title;
        epubBook.authors = authors || [];
        epubBook.isbn = isbn;
        epubBook.numPages = undefined;
        epubBook.description = description;
        epubBook.publisher = publisher;
        epubBook.fileInfo = fileInfo;
        epubBook.outline = epubData.toc || [];
        const { text, imageBase64, epub, ...printData } = epubData;
        Logger.debug('EPUB Book: ', epubBook, printData);
        if (!imageBase64) {
            epubBook.imageBase64 = EPUB.getCoverFromText({ title, publisher: publisher?.title });
        } else {
            epubBook.imageBase64 = imageBase64;
        }



        const tfIdf = new TfIdf();

        tfIdf.addDocument(text);
        let tagsIndex = 0;
        epubBook.nlpTags = tfIdf.listTerms(0 /*document index*/).filter((item: any) => {
            if (tagsIndex > 10 || /^([0-9]+|[a-zA-Z]+[0-9]+)[0-9a-zA-Z]*$/.test(item.term) || item.term.length < 3) {
                return false;
            }
            if (stopWords.includes(item.term)) {
                return false;
            }
            tagsIndex = tagsIndex + 1;
            return true;
        }).map((item: any) => item.term);

        tfIdf.addDocument(text.tokenizeAndStem());
        epubBook.nlpTerms = tfIdf.listTerms(1 /*document index*/).filter((item: any, index: number) => {
            if (index > 150 || /^([0-9]+|[a-zA-Z]+[0-9]+)[0-9a-zA-Z]*$/.test(item.term)) {
                return false;
            }
            return true;
        });

        return epubBook;
    }

}
