/*
 * Copyright ©️ 2018 Galt•Project Society Construction and Terraforming Company
 * (Founded by [Nikolai Popeka](https://github.com/npopeka)
 *
 * Copyright ©️ 2018 Galt•Core Blockchain Company
 * (Founded by [Nikolai Popeka](https://github.com/npopeka) by
 *  [Basic Agreement](ipfs/QmaCiXUmSrP16Gz8Jdzq6AJESY1EAANmmwha15uR3c1bsS)).
 */

/* global browser, document, window, setTimeout, URL, Blob, MouseEvent */

this.singlefile.extension.core.content.main =
  this.singlefile.extension.core.content.main ||
  (() => {
    const singlefile = this.singlefile;

    const MAX_CONTENT_SIZE = 64 * (1024 * 1024);
    const SingleFile = singlefile.lib.SingleFile.getClass();

    let ui,
      processing = false;

    browser.runtime.onMessage.addListener(async message => {
      if (!ui) {
        ui = singlefile.extension.ui.content.main;
      }
      if (message.method == 'content.save') {
        await savePage(message);
        return {};
      }
    });
    return {};

    async function savePage(message) {
      const options = message.options;
      if (!processing) {
        let selectionFound;
        if (options.selected) {
          selectionFound = await ui.markSelection();
        }
        if (!options.selected || selectionFound) {
          processing = true;
          try {
            const page = await processPage(options);
            await downloadPage(page, options);
          } catch (error) {
            console.error(error); // eslint-disable-line no-console
            browser.runtime.sendMessage({ method: 'ui.processError', error });
          }
        } else {
          browser.runtime.sendMessage({ method: 'ui.processCancelled' });
        }
        processing = false;
      }
    }

    async function processPage(options) {
      const frames = singlefile.lib.frameTree.content.frames;
      singlefile.lib.helper.initDoc(document);
      ui.onStartPage(options);
      const processor = new SingleFile(options);
      const preInitializationPromises = [];
      options.insertSingleFileComment = true;
      if (!options.saveRawPage) {
        if (!options.removeFrames && frames) {
          let frameTreePromise;
          if (options.loadDeferredImages) {
            frameTreePromise = new Promise(resolve =>
              setTimeout(() => resolve(frames.getAsync(options)), options.loadDeferredImagesMaxIdleTime - frames.TIMEOUT_INIT_REQUEST_MESSAGE)
            );
          } else {
            frameTreePromise = frames.getAsync(options);
          }
          ui.onLoadingFrames(options);
          frameTreePromise.then(() => ui.onLoadFrames(options));
          preInitializationPromises.push(frameTreePromise);
        }
        if (options.loadDeferredImages) {
          const lazyLoadPromise = singlefile.lib.lazy.content.loader.process(options);
          ui.onLoadingDeferResources(options);
          lazyLoadPromise.then(() => ui.onLoadDeferResources(options));
          preInitializationPromises.push(lazyLoadPromise);
        }
      }
      let index = 0,
        maxIndex = 0;
      options.onprogress = event => {
        if (event.type == event.RESOURCES_INITIALIZED) {
          maxIndex = event.detail.max;
        }
        if (event.type == event.RESOURCES_INITIALIZED || event.type == event.RESOURCE_LOADED) {
          if (event.type == event.RESOURCE_LOADED) {
            index++;
          }
          browser.runtime.sendMessage({ method: 'ui.processProgress', index, maxIndex });
          ui.onLoadResource(index, maxIndex, options);
        }
        if (event.type == event.PAGE_ENDED) {
          browser.runtime.sendMessage({ method: 'ui.processEnd' });
        } else if (!event.detail.frame) {
          if (event.type == event.PAGE_LOADING) {
            ui.onPageLoading();
          } else if (event.type == event.PAGE_LOADED) {
            ui.onLoadPage();
          } else if (event.type == event.STAGE_STARTED) {
            if (event.detail.step < 3) {
              ui.onStartStage(event.detail.step, options);
            }
          } else if (event.type == event.STAGE_ENDED) {
            if (event.detail.step < 3) {
              ui.onEndStage(event.detail.step, options);
            }
          } else if (event.type == event.STAGE_TASK_STARTED) {
            ui.onStartStageTask(event.detail.step, event.detail.task);
          } else if (event.type == event.STAGE_TASK_ENDED) {
            ui.onEndStageTask(event.detail.step, event.detail.task);
          }
        }
      };
      [options.frames] = await Promise.all(preInitializationPromises);
      const selectedFrame = options.frames && options.frames.find(frameData => frameData.requestedFrame);
      options.win = window;
      if (selectedFrame) {
        options.content = selectedFrame.content;
        options.url = selectedFrame.baseURI;
        options.canvases = selectedFrame.canvases;
        options.fonts = selectedFrame.fonts;
        options.stylesheets = selectedFrame.stylesheets;
        options.images = selectedFrame.images;
        options.posters = selectedFrame.posters;
        options.usedFonts = selectedFrame.usedFonts;
        options.shadowRoots = selectedFrame.shadowRoots;
        options.imports = selectedFrame.imports;
      } else {
        options.doc = document;
      }
      await processor.run();
      if (!options.saveRawPage && !options.removeFrames && frames) {
        frames.cleanup(options);
      }
      if (options.confirmInfobarContent) {
        options.infobarContent = ui.prompt('Infobar content', options.infobarContent) || '';
      }
      const page = await processor.getPageData();
      if (options.selected) {
        ui.unmarkSelection();
      }
      ui.onEndPage(options);
      if (options.displayStats) {
        console.log('SingleFile stats'); // eslint-disable-line no-console
        console.table(page.stats); // eslint-disable-line no-console
      }
      return page;
    }

    async function downloadPage(page, options) {
      if (options.backgroundSave) {
        for (let blockIndex = 0; blockIndex * MAX_CONTENT_SIZE < page.content.length; blockIndex++) {
          const message = {
            method: 'downloads.download',
            confirmFilename: options.confirmFilename,
            filenameConflictAction: options.filenameConflictAction,
            filename: page.filename,
            saveToClipboard: options.saveToClipboard,
            filenameReplacementCharacter: options.filenameReplacementCharacter,
          };
          message.truncated = page.content.length > MAX_CONTENT_SIZE;
          if (message.truncated) {
            message.finished = (blockIndex + 1) * MAX_CONTENT_SIZE > page.content.length;
            message.content = page.content.substring(blockIndex * MAX_CONTENT_SIZE, (blockIndex + 1) * MAX_CONTENT_SIZE);
          } else {
            message.content = page.content;
          }
          await browser.runtime.sendMessage(message);
        }
      } else {
        if (options.saveToClipboard) {
          saveToClipboard(page);
        } else {
          downloadPageForeground(page, options);
        }
      }
    }

    function downloadPageForeground(page, options) {
      if (options.confirmFilename) {
        page.filename = ui.prompt('File name', page.filename);
      }
      if (page.filename && page.filename.length) {
        const link = document.createElement('a');
        link.download = page.filename;
        link.href = URL.createObjectURL(new Blob([page.content], { type: 'text/html' }));
        link.dispatchEvent(new MouseEvent('click'));
        URL.revokeObjectURL(link.href);
      }
    }

    function saveToClipboard(page) {
      const command = 'copy';
      document.addEventListener(command, listener);
      document.execCommand(command);
      document.removeEventListener(command, listener);

      function listener(event) {
        event.clipboardData.setData('text/html', page.content);
        event.clipboardData.setData('text/plain', page.content);
        event.preventDefault();
      }
    }
  })();
