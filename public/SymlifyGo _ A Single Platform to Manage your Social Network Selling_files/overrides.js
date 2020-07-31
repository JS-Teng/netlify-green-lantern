class Overrider {
  /**
   * @typedef Box
   * @type {object}
   * @property {HTMLDivElement} boxEl
   * @property {HTMLDivElement} boxWrapper
   * @property {HTMLDivElement} boxElTag
   */

  /**
   * @typedef Attribute
   * @type {object}
   * @property {String} name
   * @property {String} value
   */

  /**
   * @typedef NodeData
   * @type {object}
   * @property {Boolean} isModifed
   * @property {String} tagName
   * @property {String} htmlContent
   * @property {String} inlineCSS
   * @property {Array<string>} customClasses
   * @property {Array<Attribute>} originalAttributes
   * @property {Array<Attribute>} updatedOriginalAttributes
   * @property {Array<Attribute>} customAttributes
   */

  constructor() {
    /**
     * @type {Box}
     * @private
     */
    this.box = this.createBox();
    /**
     * @type {Box}
     * @private
     */
    this.fixedBox = this.createBox();
    /**
     * @type {Record<string,NodeData>}
     * @private
     */
    this.nodes = {};
    /**
     * @type {HTMLElement}
     * @private
     */

    this.selectedNode = null;

    this.injectStyles();
  }

  init() {
    this.disableLinks();
    this.initDocumentListeners();
    this.initWindowListeners();
  }

  /**
   * Creates a box.
   * @return {Box}
   */
  createBox() {
    const boxEl = document.createElement("div");
    boxEl.classList.add("box-highlight");
    const boxWrapper = document.createElement("div");
    boxWrapper.classList.add("box-wrapper");
    const boxElTag = document.createElement("div");
    boxElTag.classList.add("tag-box");
    boxWrapper.appendChild(boxElTag);
    boxEl.appendChild(boxWrapper);
    document.body.appendChild(boxEl);
    return {
      boxEl,
      boxWrapper,
      boxElTag,
    };
  }

  /**
   * Sets box position.
   * @param {HTMLElement} el
   * @param {Box} box
   */

  setBoxPosition(el, box) {
    const rect = el.getBoundingClientRect();
    const scrollLeft =
      window.pageXOffset || window.document.documentElement.scrollLeft;
    const scrollTop =
      window.pageYOffset || window.document.documentElement.scrollTop;
    box.boxEl.style.width = el.offsetWidth + "px";
    box.boxEl.style.height = el.offsetHeight + "px";
    box.boxEl.style.top = Math.max(0, rect.y + scrollTop) + "px";
    box.boxEl.style.left = Math.max(0, rect.x + scrollLeft) + "px";
  }

  /**
   * Resets box position and dimensions.
   * @param {Box} box
   */
  resetBox(box) {
    box.boxEl.style.width = 0
    box.boxEl.style.height = 0
    box.boxEl.style.top = '-20px';
    box.boxEl.style.left = '-20px';
  }

  resetAllBoxes() {
    this.resetBox(this.box);
    this.resetBox(this.fixedBox);
  }

  disableLinks() {
    const anchors = document.getElementsByTagName("a");
    for (let i = 0; i < anchors.length; i++) {
      anchors[i].removeAttribute('href');
    }
  }

  createCustomNodeId() {
    return "_" + Math.random().toString(36).substr(2, 9);
  }

  /**
   * Sends node data back to parent.
   * @param {HTMLElement} el
   */
  getNodeId(el) {
    return el.getAttribute("data-id")
  }

  /**
   * Sends node data back to parent.
   * @param {HTMLElement} el
   */
  sendNodeData(el) {
    const id = this.getNodeId(el);
    const whitelist = ["class", "style", 'data-id', 'anima-layer',
      'anima-container',
      'component',
      'anima-component-wrapper',
      'anima-not-ready',
      'anima-word-break',
      'anima-hidden',
      'anima-smart-layers-pointers',
      'id',
      'anima-show-on-scroll',
      'data-initial-state'];
    const originalAttributesWhitelisted = this.nodes[
      id
    ].originalAttributes.filter((at) => !whitelist.includes(at.name));

    const globalCSS = this.nodes['globalCSS'] ? this.nodes['globalCSS'] : ""
    const payload = {
      id,
      tagName: this.nodes[id].tagName,
      htmlContent: this.nodes[id].htmlContent,
      inlineCSS: this.nodes[id].inlineCSS,
      customClasses: this.nodes[id].customClasses,
      originalAttributes: originalAttributesWhitelisted,
      customAttributes: this.nodes[id].customAttributes,
      globalCSS
    };

    parent.postMessage(
      {
        action: "edit-node",
        data: payload,
      },
      "*"
    );
  }

  afterChange() {
    const id = this.getNodeId(this.selectedNode);
    this.nodes[id].isModifed = true;
    this.sendNodeData(this.selectedNode);
    this.setBoxPosition(this.selectedNode, this.fixedBox);
    this.resetBox(this.box);
  }

  /**
   * @param {String} CSS
   */
  addGlobalCSS(CSS) {
    let styles = document.getElementById('overrides-global-css')

    if (!styles) {
      styles = document.createElement('style')
      styles.setAttribute('type', 'text/css')
      styles.setAttribute('id', 'overrides-global-css')
      document.head.appendChild(styles);
    }
    styles.innerHTML = CSS;
    this.nodes['globalCSS'] = CSS
  }
  /**
   * @param {String} HTMLString
   */
  setHTMLContent(HTMLString) {
    const id = this.getNodeId(this.selectedNode);
    this.selectedNode.innerHTML = HTMLString;
    this.nodes[id].htmlContent = HTMLString;
  }
  /**
   * @param {String} HTMLString
   */
  setInlineCSS(stylesString) {
    const id = this.getNodeId(this.selectedNode);
    this.selectedNode.setAttribute("style", stylesString);
    this.nodes[id].inlineCSS = stylesString;
  }

  /**
   * @param {String} newTagName
   */
  ChangeTagName(newTagName) {
    const id = this.getNodeId(this.selectedNode);
    const isChanged =
      this.selectedNode.tagName.toLowerCase() != newTagName.toLowerCase();
    if (isChanged) {
      const replacement = document.createElement(newTagName);
      for (let i = 0, l = this.selectedNode.attributes.length; i < l; ++i) {
        const nodeName = this.selectedNode.attributes.item(i).nodeName;
        const nodeValue = this.selectedNode.attributes.item(i).nodeValue;
        replacement.setAttribute(nodeName, nodeValue);
      }
      replacement.innerHTML = this.selectedNode.innerHTML;
      this.selectedNode.parentNode.replaceChild(replacement, this.selectedNode);
      this.selectedNode = replacement;
      this.fixedBox.boxElTag.innerHTML = this.selectedNode.tagName.toLowerCase();
      // update nodeData
      this.nodes[id].tagName = newTagName.toLowerCase();
    }
  }

  /**
   * @param {Attribute} attribute
   */
  updateOriginalAttribute(attribute) {
    const id = this.getNodeId(this.selectedNode);
    // set new attr value
    this.selectedNode.setAttribute(attribute.name, attribute.value);
    // change values in nodeData both originalAttribures and updated ones
    this.nodes[id].originalAttributes = this.nodes[id].originalAttributes.map(
      (at) => {
        if (at.name == attribute.name) {
          return {
            ...at,
            value: attribute.value,
          };
        }
        return at;
      }
    );
    this.nodes[id].updatedOriginalAttributes.push(attribute);
  }
  /**
   * @param {Attribute} attribute
   */
  setCustomAttribute(attribute) {
    const id = this.getNodeId(this.selectedNode);
    this.selectedNode.setAttribute(attribute.name, attribute.value);

    const isAlreadyDefined = this.nodes[id].customAttributes.find(
      (at) => at.name == attribute.name
    );
    if (isAlreadyDefined) {
      const index = this.nodes[id].customAttributes
        .map((at) => at.name)
        .indexOf(attribute.name);
      this.nodes[id].customAttributes[index].value = attribute.value;
    } else {
      this.nodes[id].customAttributes.push(attribute);
    }
  }
  /**
   * @param {String} attributeName
   */
  removeCustomAttribute(attributeName) {
    const id = this.getNodeId(this.selectedNode);
    this.selectedNode.removeAttribute(attributeName);
    const index = this.nodes[id].customAttributes
      .map((at) => at.name)
      .indexOf(attributeName);
    this.nodes[id].customAttributes.splice(index, 1);
  }

  /**
   * @param {String} className
   */
  addCustonCssClass(className) {
    this.selectedNode.classList.add(className);
    const id = this.getNodeId(this.selectedNode);
    this.nodes[id].customClasses.push(className);
  }
  /**
   * @param {String} className
   */
  removeCustonCssClass(className) {
    this.selectedNode.classList.remove(className);
    const id = this.getNodeId(this.selectedNode);
    const index = this.nodes[id].customClasses.indexOf(className);
    this.nodes[id].customClasses.splice(index, 1);
  }

  initDocumentListeners() {
    document.addEventListener("mouseover", (e) => {
      const id = this.getNodeId(e.target);
      if (!id) return;
      this.box.boxElTag.innerHTML = e.target.tagName.toLowerCase();
      this.setBoxPosition(e.target, this.box);
    });
    document.addEventListener("mouseout", (e) => {
      this.resetBox(this.box);
    });
    document.addEventListener("click", (e) => {
      if (e.target.parentNode && e.target.parentNode.tagName == 'A') {
        e.target.parentNode.onclick = () => false
      }
      e.stopImmediatePropagation()
      e.stopPropagation();
      e.preventDefault();
      const nodeId = e.target.getAttribute('data-id');
      if (!nodeId) return;
      if (!this.nodes[nodeId]) {
        this.nodes[nodeId] = {
          isModifed: false,
          tagName: e.target.tagName.toLowerCase(),
          customClasses: [],
          inlineCSS: e.target.getAttribute("style") || "",
          updatedOriginalAttributes: [],
          originalAttributes: [...e.target.attributes].map((obj) => ({
            name: obj.name,
            value: obj.value,
          })),
          customAttributes: [],
          htmlContent: e.target.innerHTML,
        };
      }

      this.fixedBox.boxElTag.innerHTML = e.target.tagName.toLowerCase();
      this.setBoxPosition(e.target, this.fixedBox);
      this.selectedNode = e.target;
      this.sendNodeData(e.target);
    });
  }

  initWindowListeners() {
    window.addEventListener("resize", () => this.resetAllBoxes(), false);
  }

  injectStyles() {
    const h_style = document.createElement("style");

    h_style.innerHTML = `
      .box-highlight {
        position: absolute;
        border: 1px solid #4285f4;
        background: rgba(66, 133, 244, 0.1);
        pointer-events: none;
        box-sizing: border-box;
        top:-20px;
        left:-20px;
      }
      .box-wrapper {
        width:100%;
        height:100%;
        position:relative
      }
      .tag-box {
        position: absolute;
        left: 0;
        top: -20px;
        height: 20px;
        width: auto;
        padding: 0px 8px;
        background:#4285f4;
        color:#fff;
        display: flex;
        align-items: center;
        justify-content: center;
        font-family:-apple-system, BlinkMacSystemFont, "Open Sans",sans-serif;
        font-weight:600;
        font-size:14px;
      }
    `;
    document.head.appendChild(h_style);
  }

  applyOverrides(overrides = {}) {

    if (overrides['globalCSS']) {
      overrides["globalCSS"];
      this.addGlobalCSS(overrides["globalCSS"])
    }


    let count = 0;
    Object.keys(overrides).forEach(nodeId => {

      if (nodeId == 'globalCSS') return;

      count++;
      const overrideData = overrides[nodeId];

      const el = document.querySelector(`[data-id='${nodeId}']`);
      this.selectedNode = el;

      const allAttributes = [...el.attributes].map((obj) => ({
        name: obj.name,
        value: obj.value,
      }));

      let customAttributes = []
      let originalAttributes = []
      let customClasses = overrideData.customClasses ? overrideData.customClasses : []
      let tagName = overrideData.tagName ? overrideData.tagName : el.tagName.toLocaleUpperCase()
      let inlineCSS = overrideData.inlineCSS ? overrideData.inlineCSS : ""
      let htmlContent = overrideData.htmlContent ? overrideData.htmlContent : ""

      this.nodes[nodeId] = {
        isModifed: true,
        tagName,
        customClasses: [],
        customAttributes,
        originalAttributes,
        htmlContent,
        inlineCSS,
        updatedOriginalAttributes: []
      }

      // seprate Attribures
      if (overrideData.customAttributes) {
        let temp = []
        Object.keys(overrideData.customAttributes).forEach(key => {
          temp.push({ name: key, value: overrideData.customAttributes[key] })
        })
        customAttributes = [...temp]
      }
      const atKeys = customAttributes.map(at => at.name)
      originalAttributes = allAttributes.filter(at => !atKeys.includes(at.name))


      this.nodes[nodeId].customAttributes = customAttributes
      this.nodes[nodeId].originalAttributes = originalAttributes

      if (overrideData.originalAttributes) {
        Object.keys(overrideData.originalAttributes).forEach(key => {
          this.updateOriginalAttribute({ name: key, value: overrideData.originalAttributes[key] })
        })
      }
      customAttributes.forEach(at => {
        this.setCustomAttribute(at)
      })

      customClasses.forEach(c => {
        this.addCustonCssClass(c)
      })
      this.setHTMLContent(htmlContent)
      this.setInlineCSS(inlineCSS)
      this.ChangeTagName(tagName)




    })
    console.log(`${count} element overrides processed`)
  }
}

const override = new Overrider();

window.addEventListener(
  "message",
  (e) => {
    console.log(e);
    if (!e.data.action) return;
    switch (e.data.action) {
      case "component_overrides":
        override.applyOverrides(e.data.overrides)
        break


      case "initOverride":
        override.init();
        window.animaHotspotsInstance.deactivate();
        break;
      case "clear-selection":
        override.resetBox(override.fixedBox);
        break;

      case "set-tag-name":
        override.ChangeTagName(e.data.tagName);
        override.afterChange();
        break;

      case "set-html-content":
        override.setHTMLContent(e.data.htmlContent);
        override.afterChange();
        break;

      case "set-inline-css":
        override.setInlineCSS(e.data.inlineCSS);
        override.afterChange();
        break;
      case "add-global-css":
        override.addGlobalCSS(e.data.CSS);
        override.afterChange();
        break;

      case "update-attribute-value":
        override.updateOriginalAttribute(e.data.attribute);
        override.afterChange();
        break;

      case "add-css-class":
        override.addCustonCssClass(e.data.className);
        override.afterChange();
        break;
      case "remove-css-class":
        override.removeCustonCssClass(e.data.className);
        override.afterChange();
        break;

      case "set-custom-attribute":
        override.setCustomAttribute(e.data.attribute);
        override.afterChange();

      case "update-custom-attribute":
        override.setCustomAttribute(e.data.attribute);
        override.afterChange();
        break;

      case "remove-custom-attribute":
        override.removeCustomAttribute(e.data.attributeName);
        override.afterChange();

        break;
      case "save-node":
        parent.postMessage(
          {
            action: "save-overrides",
            data: override.nodes,
          },
          "*"
        );
        break;

      default:
        break;
    }
  },
  false
);