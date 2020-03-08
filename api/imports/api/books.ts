import { Mongo } from 'meteor/mongo';
import { Meteor } from 'meteor/meteor';

import { Publisher } from './publishers';

export interface NLPTerm {
  term: string;
  tf?: number;
  idf?: number
  tfidf?: number;
}

export interface BookFile {
  root?: string;
  base?: string;
  name: string;
  dir?: string;
  ext: string;
  size: number;
  atimeMs: number;
  ctimeMs: number;
  mtimeMs: number;
  birthtimeMs: number;
  ostrioId?: string;
}

export interface Book {
  _id?: string;
  title?: string;
  numPages?: number;
  authors?: string[];
  description?: string;
  outline?: any;

  isbn?: string;
  isbn10?: string;
  isbn13?: string;

  imageBase64?: string;

  url: string;

  nlpTags?: string[];
  nlpTerms?: NLPTerm[];

  publisher?: Publisher;
  fileInfo: BookFile;
}

export const Books = new Mongo.Collection<Book>('books');

Meteor.startup(() => {
  Books._ensureIndex({ title: 1, base: 1, name: 1 });
});
