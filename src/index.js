import { ref, effect } from "@vue/reactivity";

// 只读属性特殊处理
function shouldSetAsProps (el,key,value) {
  if (key === 'form' && el.tagName ==='INPUT') return false

  return key in el
}

function createRenderer (options) {

  const {
    setElementText,
    insert,
    createElement,
    createText,
    setText,
    patchProps

  } = options
  function patch (n1,n2,container,anchor) {
   
    if (n1 && n1.type !== n2.type) {
      // 新旧节点type不同
      unmount(n1)
      n1 = null;
    }
    const {type} = n2;
    if (typeof type === 'string') {
      if (!n1) {
        // n1不存在，即为挂载
        mountElement(n2,container,anchor)
      } else {
        patchElement(n1,n2)
      }

    } else if (type === Text)  {
      if (!n1) {
        // 挂载
       const el = n2.el = createText(n2.children)
       insert(el,container)
      } else {
        // 旧节点存在
        const el = n2.el = n1.el
        if (n2.children !== n1.children) {
          setText(el,n2.children)
        }
      }

    } else if (type === Fragment) {
      if (!n1) {
        n2.children.forEach(c => patch(null,c,container))
      } else {
        // 旧节点存在，比较更新新节点
        patchChildren(n1,n2,container)
      }
    }
    
    else if (typeof type === 'object') {
      // 组件

    }
   
    

  }

  // 新旧节点打补丁
  function patchElement (oldVnode,newVnode) {
    const el = newVnode.el = oldVnode.el
 
    const oldProps = oldVnode.props
    const newProps = newVnode.props
    // 更新props
    for (const key in newProps) {
      if (newProps[key] !== oldProps[key]) {
        patchProps(el,key,oldProps[key],newProps[key])
      }
    }

    for (const key in oldProps) {
      if (!(key in newProps)) {
        patchProps(el,key,oldProps[key],null)
      }
    }

    // 更新children
    patchChildren(oldVnode,newVnode,el)

  }

  // 打补丁children
  function patchChildren (n1,n2,container) {
    
    if (typeof n2.children === 'string') {
      if (Array.isArray(n1)) {
        n1.forEach(child => unmount(child))
      }
      setElementText(container,n2.children)
    } else if (Array.isArray(n2.children)) {
        if (Array.isArray(n1.children)) {
          // diff算法
          const oldChildren = n1.children
          const newChildren = n2.children
          // 存储遇到的最大索引值
          let lastIndex = 0;
          // 遍历新children
          for(let i = 0;i<newChildren.length;i++) {
            const newVnode = newChildren[i]
            let j =0
            // 设置变量find 表示是否找到了 可复用的节点
            let find = false
            for (j;j<oldChildren.length;j++) {
              const oldVnode = oldChildren[j]

              if (newVnode.key === oldVnode.key) {
                // 找到了设置为true
                find = true
                patch(oldVnode,newVnode,container)
               if (j < lastIndex) {
                //  节点移动
                // 前一个节点
                const prevNode = newChildren[i-1]
                if (prevNode) {
                  // 存在，将其位移到prev真实节点的后面 
                  const anchor = prevNode.el.nextSibling
                  insert(newVnode.el,container,anchor)
                }
               } else {
                 lastIndex = j
               }
               break;
              }
            }
            // 如果find仍为false则没找到，则为新增节点，需要挂载
            if (!find) {
              const prevNode = newChildren[i -1]
              let anchor = null
              if (prevNode) {
                // 锚点为下一个元素
                anchor = prevNode.el.nextSibling
              } else {
                anchor = container.firstChild
              }
              // 挂载newVnode
              patch(null,newVnode,container,anchor)
            }
          }
          for(let i =0;i<oldChildren.length;i++) {
            const oldVnode = oldChildren[i]
            const has = newChildren.find(vnode => vnode.key === oldVnode.key)
            if (!has) {
              // 卸载元素
              unmount(oldVnode)
            }
          }
        } else {
          // 子节点不是一组节点
          setElementText(container,'')
          n2.children.forEach(child => patch(null,child,container))
        }
    } else {
      // 新子节点不存在
      if (Array.isArray(n1.children)) {
        n1.children.forEach(c => unmount(c))
      } else if (typeof n1.children === 'string') {
        setElementText(container,'')
      }
    }

  }
  // 挂载元素
  function mountElement (vnode,container,anchor) {
    const el = vnode.el = createElement(vnode.type)
    // props处理

    if (vnode.props) {
      for(const key in vnode.props) {
        const value = vnode.props[key]
      
        patchProps(el,key,null,vnode.props[key])
      }
    }

    if ( typeof vnode.children === 'string') {
      setElementText(el,vnode.children)
    } else if (Array.isArray(vnode.children)) {
      vnode.children.forEach((child) => {
        // 挂载阶段,旧节点不存在 为null
        patch(null,child,el)
      })
    }

    insert(el,container,anchor)

  }

  // 卸载操作
  function unmount (vnode) {
    if (vnode.type === Fragment) {
      vnode.children.forEach(c => unmount(c))
      return
    }
     const parent = vnode.el.parentNode
    if(parent) {
      parent.removeChild(vnode.el)
    }
  }

  // 渲染
  function render (vnode,container) {
    if (vnode) {
      // 新vnode存在，与旧vnode打补丁
      patch(container._vnode,vnode,container)

    } else {
      if (container._vnode) {
      
          unmount(container._vnode)
       
      }
    }

    container._vnode = vnode

  }

  return {
    render
  }
}

const renderer = createRenderer({
  // 创建元素
  createElement(tag) {
    return document.createElement(tag)
  },
  // 设置文本节点
  setElementText (el,text) {
    
    el.textContent = text

  },
  // 给定parent追加指定元素

  insert (el,parent,anchor= null) {
    parent.insertBefore(el,anchor)

  },
  createText (text) {
    return document.createTextNode(text)
  },
  setText (el,text) {
    el.nodeValue = text
  },
  patchProps (el,key,preValue,nextValue) {
    if (/^on/.test(key)) {
      // 获取invoker 伪造的事件处理函数
      // vei -> vue event invoker
      // 定义el.vei为一个对象，这样不会多个事件不会被覆盖
      const invokers = el.vei || (el.vei = {})
      let invoker = invokers[key]
      const name = key.slice(2).toLowerCase()
      if(nextValue) {
        if (!invoker) {
          // 没有invoker，伪造一个缓存到el.vei
          invoker = el.vei[key] = (e) => {
            // 触发事件时间小于绑定时间 直接return
            if (e.timeStamp < invoker.attached) return
            if (Array.isArray(invoker.value)) {
              invoker.value.forEach(fn => fn(e))
            } else {
              invoker.value(e)
            }
          }
          invoker.value = nextValue
          
          invoker.attached = performance.now();
          el.addEventListener(name,invoker,false)
        } else {
          // invoker存在 -> 更新
          invoker.value = nextValue
        }
       } else if (invoker) {
        //  新的不存在，以前的存在，移除
        el.removeEventListener(name,invoker,false)
       }
 
    } else if (key === 'class') {
      el.className = nextValue || ''

    } else if (shouldSetAsProps(el,key,nextValue)) {
      const type = typeof el[key]
     
      if (type === 'boolean' && nextValue === '') {
        el[key] = true
      } else {
        el[key] = value
      }
   } else {
    //  如果没有对应的DOM properity 则setAttribute
    el.setAttribute(key,nextValue)
   }

  },


})

const Text = Symbol()
const Fragment = Symbol()


const oldVnode = {
  type:'div',
  children:[
    {type:'p',children:'1',key:1},
    {type:'p',children:'2',key:2},
    {type:'p',children:'3',key:3},
  ]
}

const newVnode = {
  type:'div',
  children:[
    {type:'p',children:'world',key:3},
    {type:'p',children:'1',key:1},
    {type:'p',children:'2',key:2},
  ]
}


  renderer.render(oldVnode,document.querySelector('#app'))

  setTimeout(() => {
    renderer.render(newVnode,document.querySelector('#app'))
  }, 1000);







