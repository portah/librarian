/**
 *  Working With PDF?
 *  pdfjs
 */
import { PDFDocumentProxy, version, getDocument } from 'pdfjs-dist';
// import * as PDFJS from 'pdfjs-dist';
import * as Canvas from 'canvas';

const assert = require('assert').strict;

class NodeCanvasFactory {
    create(width: number, height: number) {
        assert(width > 0 && height > 0, 'Invalid canvas size');
        const canvas = Canvas.createCanvas(width, height);
        const context = canvas.getContext('2d');
        return {
            canvas,
            context
        };
    }

    reset(canvasAndContext: any, width: number, height: number) {
        assert(canvasAndContext.canvas, 'Canvas is not specified');
        assert(width > 0 && height > 0, 'Invalid canvas size');
        canvasAndContext.canvas.width = width;
        canvasAndContext.canvas.height = height;
    }

    destroy(canvasAndContext: any) {
        assert(canvasAndContext.canvas, 'Canvas is not specified');

        // Zeroing the width and height cause Firefox to release graphics
        // resources immediately, which can greatly reduce memory consumption.
        canvasAndContext.canvas.width = 0;
        canvasAndContext.canvas.height = 0;
        canvasAndContext.canvas = null;
        canvasAndContext.context = null;
    }
}


async function image_page(pageData: any, scale?: number) {
    if (!scale) {
        scale = 0.5;
    }
    const viewport = pageData.getViewport({ scale });
    const canvasFactory = new NodeCanvasFactory();
    const canvasAndContext = canvasFactory.create(
        viewport.width,
        viewport.height
    );
    const renderContext = {
        canvasContext: canvasAndContext.context,
        viewport,
        canvasFactory
    };

    const imageBuffer = await pageData.render(renderContext).promise
        .then(() => canvasAndContext.canvas.toBuffer());

    return imageBuffer.toString('base64');
}

function render_page(pageData: any) {
    // check documents https://mozilla.github.io/pdf.js/
    // ret.text = ret.text ? ret.text : '';

    const renderOptions = {
        // replaces all occurrences of whitespace with standard spaces (0x20). The default value is `false`.
        normalizeWhitespace: false,
        // do not attempt to combine same line TextItem's. The default value is `false`.
        disableCombineTextItems: false
    };

    return pageData.getTextContent(renderOptions)
        .then((textContent: any) => {
            let lastY, text = '';
            // https://github.com/mozilla/pdf.js/issues/8963
            // https://github.com/mozilla/pdf.js/issues/2140
            // https://gist.github.com/hubgit/600ec0c224481e910d2a0f883a7b98e3
            // https://gist.github.com/hubgit/600ec0c224481e910d2a0f883a7b98e3
            for (const item of textContent.items) {
                if (lastY === item.transform[5] || !lastY) {
                    text += item.str;
                } else {
                    text += '\n' + item.str;
                }
                lastY = item.transform[5];
            }
            // let strings = textContent.items.map(item => item.str);
            // let text = strings.join('\n');
            // text = text.replace(/[ ]+/ig,' ');
            // ret.text = `${ret.text} ${text} \n\n`;
            return text;
        });
}

const DEFAULT_OPTIONS = {
    pagerender: render_page,
    max: 0,
    // check https://mozilla.github.io/pdf.js/getting_started/
    version
};

export async function PDF(dataBuffer: any, options?: any) {
    // var isDebugMode = false;

    const ret: any = {
        numPages: 0,
        numrender: 0,
        info: null,
        metadata: null,
        text: '',
        imageBase64: '',
        version
    };

    if (typeof options === 'undefined') { options = DEFAULT_OPTIONS; }
    if (typeof options.pagerender !== 'function') { options.pagerender = DEFAULT_OPTIONS.pagerender; }
    if (typeof options.max !== 'number') { options.max = DEFAULT_OPTIONS.max; }
    if (typeof options.version !== 'string') { options.version = DEFAULT_OPTIONS.version; }
    if (options.version === 'default') { options.version = DEFAULT_OPTIONS.version; }

    // PDFJS = PDFJS ? PDFJS : require(`./pdf.js/${options.version}/build/pdf.js`);


    // Disable workers to avoid yet another cross-origin issue (workers need
    // the URL of the script to be loaded, and dynamically loading a cross-origin
    // script does not work).
    // PDFJS.disableWorker = true;
    const doc: PDFDocumentProxy | any = await getDocument(dataBuffer);
    ret.numPages = doc.numPages;

    const metaData = await doc.getMetadata();
    // .catch((err: any) => {
    //     return null;
    // });

    ret.info = metaData ? metaData.info : null;
    ret.metadata = metaData ? metaData.metadata : null;

    let counter = options.max <= 0 ? doc.numPages : options.max;
    counter = counter > doc.numPages ? doc.numPages : counter;

    ret.text = '';

    for (let i = 1; i <= counter; i++) {
        const pageText = await doc.getPage(i)
            .then(async (pageData: any) => {
                if (i === 1) {
                    ret.imageBase64 = 'data:image/png;base64,' + await image_page(pageData);
                }
                return options.pagerender(pageData);
            });
        // .catch((err: any) => {
        //     // todo log err using debug
        //     // debugger;
        //     return '';
        // });

        ret.text = `${ret.text}\n\n${pageText}`;
    }

    ret.numrender = counter;
    doc.destroy();

    return ret;
}
