/*
 * Copyright ©️ 2018 Galt•Project Society Construction and Terraforming Company
 * (Founded by [Nikolai Popeka](https://github.com/npopeka)
 *
 * Copyright ©️ 2018 Galt•Core Blockchain Company
 * (Founded by [Nikolai Popeka](https://github.com/npopeka) by
 *  [Basic Agreement](ipfs/QmaCiXUmSrP16Gz8Jdzq6AJESY1EAANmmwha15uR3c1bsS)).
 */

this.singlefile.lib.modules.matchedRules =
  this.singlefile.lib.modules.matchedRules ||
  (() => {
    const singlefile = this.singlefile;

    const MEDIA_ALL = 'all';
    const IGNORED_PSEUDO_ELEMENTS = ['after', 'before', 'first-letter', 'first-line', 'placeholder', 'selection'];
    const REGEXP_VENDOR_IDENTIFIER = /-(ms|webkit|moz|o)-/;
    const DEBUG = false;

    class MatchedRules {
      constructor(doc, stylesheets, styles) {
        this.doc = doc;
        this.mediaAllInfo = createMediaInfo(MEDIA_ALL);
        const matchedElementsCache = new Map();
        let sheetIndex = 0;
        const workStyleElement = doc.createElement('style');
        doc.body.appendChild(workStyleElement);
        stylesheets.forEach(stylesheetInfo => {
          if (!stylesheetInfo.scoped) {
            const cssRules = stylesheetInfo.stylesheet.children;
            if (cssRules) {
              if (stylesheetInfo.mediaText && stylesheetInfo.mediaText != MEDIA_ALL) {
                const mediaInfo = createMediaInfo(stylesheetInfo.mediaText);
                this.mediaAllInfo.medias.set('style-' + sheetIndex + '-' + stylesheetInfo.mediaText, mediaInfo);
                getMatchedElementsRules(doc, cssRules, mediaInfo, sheetIndex, styles, matchedElementsCache, workStyleElement);
              } else {
                getMatchedElementsRules(doc, cssRules, this.mediaAllInfo, sheetIndex, styles, matchedElementsCache, workStyleElement);
              }
            }
          }
          sheetIndex++;
        });
        let startTime;
        if (DEBUG) {
          startTime = Date.now();
          log('  -- STARTED sortRules');
        }
        sortRules(this.mediaAllInfo);
        if (DEBUG) {
          log('  -- ENDED sortRules', Date.now() - startTime);
          startTime = Date.now();
          log('  -- STARTED computeCascade');
        }
        computeCascade(this.mediaAllInfo, [], this.mediaAllInfo, workStyleElement);
        workStyleElement.remove();
        if (DEBUG) {
          log('  -- ENDED computeCascade', Date.now() - startTime);
        }
      }

      getMediaAllInfo() {
        return this.mediaAllInfo;
      }
    }

    return {
      getMediaAllInfo(doc, stylesheets, styles) {
        return new MatchedRules(doc, stylesheets, styles).getMediaAllInfo();
      },
    };

    function createMediaInfo(media) {
      const mediaInfo = { media: media, elements: new Map(), medias: new Map(), rules: new Map(), pseudoRules: new Map() };
      if (media == MEDIA_ALL) {
        mediaInfo.matchedStyles = new Map();
      }
      return mediaInfo;
    }

    function getMatchedElementsRules(doc, cssRules, mediaInfo, sheetIndex, styles, matchedElementsCache, workStylesheet) {
      const cssTree = singlefile.lib.vendor.cssTree;
      let mediaIndex = 0;
      let ruleIndex = 0;
      let startTime;
      if (DEBUG && cssRules.length > 1) {
        startTime = Date.now();
        log('  -- STARTED getMatchedElementsRules', ' index =', sheetIndex, 'rules.length =', cssRules.length);
      }
      cssRules.forEach(ruleData => {
        if (ruleData.block && ruleData.block.children && ruleData.prelude && ruleData.prelude.children) {
          if (ruleData.type == 'Atrule' && ruleData.name == 'media') {
            const mediaText = cssTree.generate(ruleData.prelude);
            const ruleMediaInfo = createMediaInfo(mediaText);
            mediaInfo.medias.set('rule-' + sheetIndex + '-' + mediaIndex + '-' + mediaText, ruleMediaInfo);
            mediaIndex++;
            getMatchedElementsRules(doc, ruleData.block.children, ruleMediaInfo, sheetIndex, styles, matchedElementsCache, workStylesheet);
          } else if (ruleData.type == 'Rule') {
            const selectors = ruleData.prelude.children.toArray();
            const selectorsText = ruleData.prelude.children.toArray().map(selector => cssTree.generate(selector));
            const ruleInfo = { ruleData, mediaInfo, ruleIndex, sheetIndex, matchedSelectors: new Set(), declarations: new Set(), selectors, selectorsText };
            if (!invalidSelector(selectorsText.join(','), workStylesheet)) {
              for (let selector = ruleData.prelude.children.head, selectorIndex = 0; selector; selector = selector.next, selectorIndex++) {
                const selectorText = selectorsText[selectorIndex];
                const selectorInfo = { selector, selectorText, ruleInfo };
                getMatchedElementsSelector(doc, selectorInfo, styles, matchedElementsCache);
              }
            }
            ruleIndex++;
          }
        }
      });
      if (DEBUG && cssRules.length > 1) {
        log('  -- ENDED   getMatchedElementsRules', 'delay =', Date.now() - startTime);
      }
    }

    function invalidSelector(selectorText, workStylesheet) {
      workStylesheet.textContent = selectorText + '{}';
      return !workStylesheet.sheet.cssRules.length;
    }

    function getMatchedElementsSelector(doc, selectorInfo, styles, matchedElementsCache) {
      const filteredSelectorText = getFilteredSelector(selectorInfo.selector, selectorInfo.selectorText);
      const selectorText = filteredSelectorText != selectorInfo.selectorText ? filteredSelectorText : selectorInfo.selectorText;
      const cachedMatchedElements = matchedElementsCache.get(selectorText);
      let matchedElements = cachedMatchedElements;
      if (!matchedElements) {
        try {
          matchedElements = doc.querySelectorAll(selectorText);
        } catch (error) {
          // ignored
        }
      }
      if (matchedElements) {
        if (!cachedMatchedElements) {
          matchedElementsCache.set(selectorText, matchedElements);
        }
        if (matchedElements.length) {
          if (filteredSelectorText == selectorInfo.selectorText) {
            matchedElements.forEach(element => addRule(element, selectorInfo, styles));
          } else {
            let pseudoSelectors = selectorInfo.ruleInfo.mediaInfo.pseudoRules.get(selectorInfo.ruleInfo.ruleData);
            if (!pseudoSelectors) {
              pseudoSelectors = new Set();
              selectorInfo.ruleInfo.mediaInfo.pseudoRules.set(selectorInfo.ruleInfo.ruleData, pseudoSelectors);
            }
            pseudoSelectors.add(selectorInfo.selectorText);
          }
        }
      }
    }

    function getFilteredSelector(selector, selectorText) {
      const cssTree = singlefile.lib.vendor.cssTree;
      const removedSelectors = [];
      selector = { data: cssTree.parse(cssTree.generate(selector.data), { context: 'selector' }) };
      filterPseudoClasses(selector);
      if (removedSelectors.length) {
        removedSelectors.forEach(({ parentSelector, selector }) => {
          if (parentSelector.data.children.getSize() == 0 || !selector.prev || selector.prev.data.type == 'Combinator' || selector.prev.data.type == 'WhiteSpace') {
            parentSelector.data.children.replace(selector, cssTree.parse('*', { context: 'selector' }).children.head);
          } else {
            parentSelector.data.children.remove(selector);
          }
        });
        selectorText = cssTree.generate(selector.data).trim();
      }
      return selectorText;

      function filterPseudoClasses(selector, parentSelector) {
        if (selector.data.children) {
          for (let childSelector = selector.data.children.head; childSelector; childSelector = childSelector.next) {
            filterPseudoClasses(childSelector, selector);
          }
        }
        if (
          selector.data.type == 'PseudoClassSelector' ||
          (selector.data.type == 'PseudoElementSelector' && (testVendorPseudo(selector) || IGNORED_PSEUDO_ELEMENTS.includes(selector.data.name)))
        ) {
          removedSelectors.push({ parentSelector, selector });
        }
      }

      function testVendorPseudo(selector) {
        const name = selector.data.name;
        return name.startsWith('-') || name.startsWith('\\-');
      }
    }

    function addRule(element, selectorInfo, styles) {
      const mediaInfo = selectorInfo.ruleInfo.mediaInfo;
      const elementStyle = styles.get(element);
      let elementInfo = mediaInfo.elements.get(element);
      if (!elementInfo) {
        elementInfo = [];
        if (elementStyle) {
          elementInfo.push({ styleInfo: { styleData: elementStyle, declarations: new Set() } });
        }
        mediaInfo.elements.set(element, elementInfo);
      }
      const specificity = computeSpecificity(selectorInfo.selector.data);
      specificity.ruleIndex = selectorInfo.ruleInfo.ruleIndex;
      specificity.sheetIndex = selectorInfo.ruleInfo.sheetIndex;
      selectorInfo.specificity = specificity;
      elementInfo.push(selectorInfo);
    }

    function computeCascade(mediaInfo, parentMediaInfo, mediaAllInfo, workStylesheet) {
      mediaInfo.elements.forEach((elementInfo /*, element*/) =>
        getDeclarationsInfo(elementInfo, workStylesheet /*, element*/).forEach((declarationsInfo, property) => {
          if (declarationsInfo.selectorInfo.ruleInfo || mediaInfo == mediaAllInfo) {
            let info;
            if (declarationsInfo.selectorInfo.ruleInfo) {
              info = declarationsInfo.selectorInfo.ruleInfo;
              const ruleData = info.ruleData;
              const ascendantMedia = [mediaInfo, ...parentMediaInfo].find(media => media.rules.get(ruleData)) || mediaInfo;
              ascendantMedia.rules.set(ruleData, info);
              if (ruleData) {
                info.matchedSelectors.add(declarationsInfo.selectorInfo.selectorText);
              }
            } else {
              info = declarationsInfo.selectorInfo.styleInfo;
              const styleData = info.styleData;
              const matchedStyleInfo = mediaAllInfo.matchedStyles.get(styleData);
              if (!matchedStyleInfo) {
                mediaAllInfo.matchedStyles.set(styleData, info);
              }
            }
            if (!info.declarations.has(property)) {
              info.declarations.add(property);
            }
          }
        })
      );
      delete mediaInfo.elements;
      mediaInfo.medias.forEach(childMediaInfo => computeCascade(childMediaInfo, [mediaInfo, ...parentMediaInfo], mediaAllInfo, workStylesheet));
    }

    function getDeclarationsInfo(elementInfo, workStylesheet /*, element*/) {
      const declarationsInfo = new Map();
      const processedProperties = new Set();
      elementInfo.forEach(selectorInfo => {
        let declarations;
        if (selectorInfo.styleInfo) {
          declarations = selectorInfo.styleInfo.styleData.children;
        } else {
          declarations = selectorInfo.ruleInfo.ruleData.block.children;
        }
        processDeclarations(declarationsInfo, declarations, selectorInfo, processedProperties, workStylesheet);
      });
      return declarationsInfo;
    }

    function processDeclarations(declarationsInfo, declarations, selectorInfo, processedProperties, workStylesheet) {
      const cssTree = singlefile.lib.vendor.cssTree;
      for (let declaration = declarations.tail; declaration; declaration = declaration.prev) {
        const declarationData = declaration.data;
        const declarationText = cssTree.generate(declarationData);
        if (
          declarationData.type == 'Declaration' &&
          (declarationText.match(REGEXP_VENDOR_IDENTIFIER) || !processedProperties.has(declarationData.property) || declarationData.important) &&
          !invalidDeclaration(declarationText, workStylesheet)
        ) {
          const declarationInfo = declarationsInfo.get(declarationData);
          if (!declarationInfo || (declarationData.important && !declarationInfo.important)) {
            declarationsInfo.set(declarationData, { selectorInfo, important: declarationData.important });
            if (!declarationText.match(REGEXP_VENDOR_IDENTIFIER)) {
              processedProperties.add(declarationData.property);
            }
          }
        }
      }
    }

    function invalidDeclaration(declarationText, workStylesheet) {
      let invalidDeclaration;
      workStylesheet.textContent = 'single-file-declaration { ' + declarationText + '}';
      if (!workStylesheet.sheet.cssRules[0].style.length) {
        if (!declarationText.match(REGEXP_VENDOR_IDENTIFIER)) {
          invalidDeclaration = true;
        }
      }
      return invalidDeclaration;
    }

    function sortRules(media) {
      media.elements.forEach(elementRules =>
        elementRules.sort((ruleInfo1, ruleInfo2) =>
          ruleInfo1.styleInfo && !ruleInfo2.styleInfo ? -1 : !ruleInfo1.styleInfo && ruleInfo2.styleInfo ? 1 : compareSpecificity(ruleInfo1.specificity, ruleInfo2.specificity)
        )
      );
      media.medias.forEach(sortRules);
    }

    function computeSpecificity(selector, specificity = { a: 0, b: 0, c: 0 }) {
      if (selector.type == 'IdSelector') {
        specificity.a++;
      }
      if (selector.type == 'ClassSelector' || selector.type == 'AttributeSelector' || (selector.type == 'PseudoClassSelector' && selector.name != 'not')) {
        specificity.b++;
      }
      if ((selector.type == 'TypeSelector' && selector.name != '*') || selector.type == 'PseudoElementSelector') {
        specificity.c++;
      }
      if (selector.children) {
        selector.children.forEach(selector => computeSpecificity(selector, specificity));
      }
      return specificity;
    }

    function compareSpecificity(specificity1, specificity2) {
      if (specificity1.a > specificity2.a) {
        return -1;
      } else if (specificity1.a < specificity2.a) {
        return 1;
      } else if (specificity1.b > specificity2.b) {
        return -1;
      } else if (specificity1.b < specificity2.b) {
        return 1;
      } else if (specificity1.c > specificity2.c) {
        return -1;
      } else if (specificity1.c < specificity2.c) {
        return 1;
      } else if (specificity1.sheetIndex > specificity2.sheetIndex) {
        return -1;
      } else if (specificity1.sheetIndex < specificity2.sheetIndex) {
        return 1;
      } else if (specificity1.ruleIndex > specificity2.ruleIndex) {
        return -1;
      } else if (specificity1.ruleIndex < specificity2.ruleIndex) {
        return 1;
      } else {
        return -1;
      }
    }

    function log(...args) {
      console.log('S-File <css-mat>', ...args); // eslint-disable-line no-console
    }
  })();
