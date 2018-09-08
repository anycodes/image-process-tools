/**
 * Created by zx1984 9/7/2018
 * https://github.com/zx1984
 */
import dom from './dom-core'
import util from './util'
import broadcast from './broadcast'
import { browser, touchEvents } from './event'
// default options
const DEFAULT_OPTIONS = {
  width: 750,
  height: 750,
  // 裁剪框容器
  wrapper: null
}

const MIN_SIZE = 60
// window尺寸
const WIN_WIDTH = window.innerWidth
// const WIN_HEIGHT = window.innerHeight

// crop
class Crop {
  /**
   * constructor
   * @param opts
   */
  constructor (opts) {
    // 是否显示
    this.visible = false
    this.$wrapper = null
    this.$img = null
    this.$docBody = null
    // 裁剪框位置信息
    this.cropBoxPos = {}
    this.options = Object.assign({}, DEFAULT_OPTIONS, opts)
    // init
    this.init(this.options)
  }

  init (opts) {
    // 裁剪框尺寸计算
    let cropLineWidth = Math.min(opts.width, WIN_WIDTH * 0.8)
    let cropLineHeight = opts.height / opts.width * cropLineWidth
    // 裁剪容器
    const cropVnode = {
      attrs: {
        class: 'zx-image-crop-container',
        style: `z-index:${dom.maxZIndex() + 1};display:none;`
      },
      child: [
        {
          attrs: {
            class: 'zx-image-crop-wrapper'
          },
          child: [
            {
              attrs: {
                class: 'crop-line-box',
                style: `width:${cropLineWidth}px;height:${cropLineHeight}px;`
              }
            }
          ]
        },
        {
          tag: 'img',
          attrs: {
            class: 'zx-image-target'
          }
        },
        {
          attrs: {
            class: 'zx-crop-btns-wrapper'
          },
          child: [
            {
              tag: 'button',
              attrs: {
                class: '__cancel'
              },
              child: '取消'
            },
            {
              tag: 'button',
              attrs: {
                class: '__submit'
              },
              child: '确定'
            }
          ]
        }
      ]
    }
    // 创建创建容器
    this.$wrapper = dom.createVdom(cropVnode)
    this.$docBody = dom.query('body')
    this.$docBody.appendChild(this.$wrapper)
    this.$img = dom.query('.zx-image-target', this.$wrapper)
    // 初始化事件
    this._initEvent()
  }

  _initLineBoxPos (cropLineWidth, cropLineHeight) {
    const $lineBox = dom.query('.crop-line-box')
    this.cropBoxPos = $lineBox.getBoundingClientRect()
  }

  _initEvent () {
    let $crop
    if (browser.ie10) {
      $crop = document
    } else {
      $crop = dom.query('.zx-image-crop-wrapper', this.$wrapper)
    }
    // 移动
    this._move($crop)
    // 缩放
    mouseWheel($crop, e => {
      // 浏览器兼容处理
      // 鼠标滚动方向
      let wheelDelta = e.wheelDelta || -e.detail
      this._scale(wheelDelta)
    })
    // 确定
    const $btnSubmit = dom.query('.__submit', this.$wrapper)
    dom.addEvent($btnSubmit, 'click', _ => {
      this.submit()
    })
    // 取消
    const $btnCancel = dom.query('.__cancel', this.$wrapper)
    dom.addEvent($btnCancel, 'click', _ => {
      this.hide()
    })
  }

  /**
   * 移动， 拖动
   * @param $crop
   * @private
   */
  _move ($crop) {
    const $img = this.$img
    // 鼠标在图片上按下
    let isMousedownOnImage = false
    // isTouchEvent
    let isTouchEvent = false
    // 鼠标按下位置图片左上角位置
    let moveBeforePostion = {}
    // 开始
    dom.addEvent($crop, touchEvents.touchStart, e => {
      // log(e.type)
      // 防止触发浏览器图片拖动行为
      // e.preventDefault()
      isMousedownOnImage = true
      isTouchEvent = e.type === 'touchstart'

      // prevent user enter with right and the swiper move (needs isTouchEvent)
      if (!isTouchEvent && 'which' in e && e.which === 3) {
        isMousedownOnImage = false
        return
      }

      if (!isTouchEvent || e.targetTouches.length === 1) {
        if (!isTouchEvent && !util.isAndroid()) {
          if (e.preventDefault) {
            e.preventDefault()
          } else {
            e.returnValue = false
          }
        }

        let pageX = isTouchEvent ? e.targetTouches[0].pageX : (e.pageX || e.clientX)
        let pageY = isTouchEvent ? e.targetTouches[0].pageY : (e.pageY || e.clientY)

        moveBeforePostion.x = pageX - $img.offsetLeft
        moveBeforePostion.y = pageY - $img.offsetTop
      }
    })

    let l, t
    // 拖动
    dom.addEvent(document, touchEvents.touchMove, e => {
      if (!isMousedownOnImage) return
      // e.preventDefault()
      // log(e)
      if (!isTouchEvent && !util.isAndroid()) {
        if (e.preventDefault) {
          e.preventDefault()
        } else {
          e.returnValue = false
        }
      }

      let pageX = isTouchEvent ? e.targetTouches[0].pageX : (e.pageX || e.clientX)
      let pageY = isTouchEvent ? e.targetTouches[0].pageY : (e.pageY || e.clientY)

      l = pageX - moveBeforePostion.x
      t = pageY - moveBeforePostion.y
      // check image position
      let cropBoxPos = this.cropBoxPos
      let imgPos = this.$img.getBoundingClientRect()
      // log(imgPos)
      // log(cropBoxPos)
      // ie11 无x/y属性
      if (cropBoxPos.left <= l) {
        l = cropBoxPos.left
      }
      if (l <= cropBoxPos.right - imgPos.width) {
        l = cropBoxPos.right - imgPos.width
      }
      if (cropBoxPos.top <= t) {
        t = cropBoxPos.top
      }
      if (t <= cropBoxPos.bottom - imgPos.height) {
        t = cropBoxPos.bottom - imgPos.height
      }
      $img.style.left = l + 'px'
      $img.style.top = t + 'px'
    })

    // 释放鼠标
    dom.addEvent(document, touchEvents.touchEnd, _ => {
      isMousedownOnImage = false
    })
  }

  _scale (wheelDelta) {
    this._scaleHandler(wheelDelta > 0)
  }

  /**
   * @param isEnlarge 是否放大
   * @private
   */
  _scaleHandler (isEnlarge) {
    const $img = this.$img
    let naturalWidth = $img.naturalWidth
    // let naturalHeight = $img.naturalHeight
    let imgWidth = $img.width
    let imgHeight = $img.height
    let iw, ih
    if (isEnlarge) {
      iw = imgWidth * 1.1
      // 最大放大2倍
      if (iw >= naturalWidth * 3) return
    } else {
      // 图片实际尺寸小于最小限制尺寸
      if (naturalWidth < MIN_SIZE) return
      iw = imgWidth * 0.9
      if (iw <= MIN_SIZE) return
    }
    ih = iw * imgHeight / imgWidth
    // check
    let cropBoxPos = this.cropBoxPos
    let imgPos = this.$img.getBoundingClientRect()
    // check image size
    if (iw <= cropBoxPos.width) {
      iw = cropBoxPos.width
      ih = imgPos.height / imgPos.width * iw
    }
    if (ih <= cropBoxPos.height) {
      ih = cropBoxPos.height
      iw = imgPos.width / imgPos.height * ih
    }
    $img.style.width = iw + 'px'
    $img.style.height = ih + 'px'

    // 图片增加的宽度、高度
    let addW = iw - imgWidth
    let addH = ih - imgHeight
    let css = dom.getStyle($img)
    let l = util.int(util.int(css.left) - addW / 2)
    let t = util.int(util.int(css.top) - addH / 2)
    // check image position
    if (cropBoxPos.left <= l) {
      l = cropBoxPos.left
    }
    if (l <= cropBoxPos.right - imgPos.width) {
      l = cropBoxPos.right - imgPos.width
    }
    if (cropBoxPos.top <= t) {
      t = cropBoxPos.top
    }
    if (t <= cropBoxPos.bottom - imgPos.height) {
      t = cropBoxPos.bottom - imgPos.height
    }

    $img.style.top = t + 'px'
    $img.style.left = l + 'px'
  }

  updateImage (url) {
    if (this.$img === null) {
      broadcast.emit('error', { msg: `Failed to updateImage(url)`})
      return
    }
    if (this.$img.src === url) return
    // 清除样式，防止图片变形
    this.$img.setAttribute('style', '')
    this.$img.src = url
  }

  submit () {
    // 裁剪框位置
    let cropBoxPos = this.cropBoxPos
    // 图片位置
    let imgPos = this.$img.getBoundingClientRect()
    let result = {
      naturalWidth: this.$img.naturalWidth,
      naturalHeight: this.$img.naturalHeight,
      currentWidth: imgPos.width,
      currentHeight: imgPos.height,
      targetWidth: cropBoxPos.width,
      targetHeight: cropBoxPos.height,
      x: cropBoxPos.left - imgPos.left,
      y: cropBoxPos.top - imgPos.top,
      base64: this.data
    }
    broadcast.emit('crop-submit', result)
    this.hide()
  }

  show () {
    if (this.visible) return
    this.visible = true
    this.$wrapper.style.display = ''
    this._initLineBoxPos()
    dom.lock(this.$docBody)
  }

  hide () {
    if (this.visible) {
      this.visible = false
      this.$wrapper.style.display = 'none'
      dom.unlock(this.$docBody)
    }
  }
}

/**
 * 滚动鼠标事件
 * @param $el
 * @param wheelHandler
 */
export function mouseWheel ($el, wheelHandler) {
  // 鼠标滚动事件
  dom.addEvent($el, 'mousewheel', wheelHandler)
  // 火狐鼠标滚动事件
  dom.addEvent($el, 'DOMMouseScroll', wheelHandler)
}

export default Crop