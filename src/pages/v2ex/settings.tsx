import React, {useEffect, useState} from "react"
import {delRevoke, DoDialogProps, DoPasswdField, DoTextFieldBtn, useSharedSnackbar} from "do-comps"
import Stack from "@mui/material/Stack"
import Button from "@mui/material/Button"
import {Chip, Divider} from "@mui/material"
import {get} from "./comm"
import type {Node} from "./types"
import {DndContext, DragEndEvent, PointerSensor, useSensor, useSensors} from "@dnd-kit/core"
import {arrayMove, SortableContext, useSortable} from "@dnd-kit/sortable"
import {CSS} from "@dnd-kit/utilities"

// 存储到 chromium storage 数据的键
export const CS_KEY_V2EX_TOPICS = "v2exTopics"

/**
 * 存储到 chromium storage 中的数据
 */
export type V2exNodeItem = {
  name: string
  title: string
}
export type V2exSets = {
  token?: string
  nodes?: V2exNodeItem[]
}
// 初始值
const initValue: V2exSets = {}

// 获取节点的标题
const getNodeTitle = async (name: string): Promise<V2exNodeItem | undefined> => {
  // 根据节点名联网获取节点标题
  let node = await get<Node>(`https://www.v2ex.com/api/v2/nodes/${name}`)
  if (!node) {
    return
  }

  return {name: name, title: node.title}
}

/**
 * V2ex 的设置面板
 */
const V2exSettings = React.memo((props: { showDialog: (ps: DoDialogProps) => void }): JSX.Element => {
  const [v2Sets, setV2Sets] = useState(initValue)
  // 显示消息
  const {showSb} = useSharedSnackbar()

  // 更新界面、存储
  const saveAfterAdded = React.useCallback(async (newItem: V2exNodeItem) => {
    // 存储
    let storage = await chrome.storage.sync.get({[CS_KEY_V2EX_TOPICS]: {}})
    let sets: V2exSets = storage[CS_KEY_V2EX_TOPICS]
    sets.nodes = sets.nodes || []
    sets.nodes.push(newItem)
    chrome.storage.sync.set({[CS_KEY_V2EX_TOPICS]: sets})

    // 更新界面
    setV2Sets(prev => {
      let nodes = [...prev.nodes || []]
      nodes.push(newItem)
      return {...prev, nodes}
    })
  }, [])

  // 添加节点
  const onAddNode = React.useCallback(async (name: string) => {
    // 先判断是否已添加过该节点
    // 为了简单只通过前端中的数据判断，不通过存储中的数据判断
    let index = v2Sets.nodes?.findIndex(item => item.name === name)
    if (index !== undefined && index >= 0) {
      console.log(`已存在该节点'${name}'，不需重复添加`)
      showSb({open: true, message: `已存在该节点'${name}'，不需重复添加`, severity: "warning"})
      return
    }

    // 获取节点数据，存储
    let newItem = await getNodeTitle(name)
    if (!newItem) {
      showSb({open: true, message: "无法读取节点的信息，可以查看控制台", severity: "error"})
      return
    }

    await saveAfterAdded(newItem)
  }, [v2Sets.nodes])

  // 删除节点
  const onDelNode = React.useCallback((name: string, title: string) => {
    delRevoke(`节点'${title}'`, v2Sets, async () => {
      let storage = await chrome.storage.sync.get({[CS_KEY_V2EX_TOPICS]: {}})
      let sets: V2exSets = storage[CS_KEY_V2EX_TOPICS]
      sets.nodes = sets.nodes?.filter(item => item.name !== name)
      chrome.storage.sync.set({[CS_KEY_V2EX_TOPICS]: sets})

      setV2Sets(prev => {
        let nodes = prev.nodes?.filter(item => item.name !== name)
        if (!nodes) {
          console.log(`"无法删除节点：没有找到该节点'${name}'的索引"`)
          showSb({open: true, message: `"无法删除节点：没有找到该节点'${name}'的索引"`, severity: "error"})
          return prev
        }

        return {...prev, nodes}
      })
    }, () => saveAfterAdded({name: name, title: title}), showSb)
  }, [v2Sets.nodes])

  // 拖动
  const onDragEnd = React.useCallback(async ({active, over}: DragEndEvent) => {
    if (!over?.id) {
      return
    }

    if (active.id === over.id) {
      return
    }

    // 更新界面、存储
    let nodes = v2Sets.nodes
    if (!nodes) {
      return
    }

    // 根据拖动情况，交换数组元素
    const oldIndex = nodes.findIndex(item => item.name === active.id)
    const newIndex = nodes.findIndex(item => item.name === over.id)
    nodes = arrayMove(nodes, oldIndex, newIndex)
    // 存储
    let storage = await chrome.storage.sync.get({[CS_KEY_V2EX_TOPICS]: {}})
    let sets: V2exSets = storage[CS_KEY_V2EX_TOPICS]
    sets.nodes = nodes
    chrome.storage.sync.set({[CS_KEY_V2EX_TOPICS]: sets})

    // 更新界面
    setV2Sets(sets => {
      let nodes = sets.nodes
      if (!nodes) {
        return sets
      }

      const oldIndex = nodes.findIndex(item => item.name === active.id)
      const newIndex = nodes.findIndex(item => item.name === over.id)
      nodes = arrayMove(nodes, oldIndex, newIndex)
      return {...sets, nodes}
    })
  }, [v2Sets, setV2Sets])

  // 节点项（可拖动）
  const SortableItem = React.useCallback(({node}: { node: V2exNodeItem }) => {
    // 获取元素的属性
    let id = {id: node.name}
    const {attributes, listeners, setNodeRef, transform, transition, isDragging} = useSortable(id)

    // 设置元素被拖动时的样式
    const sortableStyle = {
      transform: CSS.Transform.toString(transform),
      transition,
      zIndex: isDragging ? "100" : "auto",
      opacity: isDragging ? 0.5 : 1,
    }

    return <Chip ref={setNodeRef} id={node.name}
                 sx={{width: "fit-content", ...sortableStyle}} {...attributes} {...listeners}
                 label={node.title} onDelete={() => onDelNode(node.name, node.title)}/>
  }, [])

  // 显示所有节点
  const nodes = React.useMemo(() => v2Sets.nodes?.map(node =>
    <SortableItem key={node.name} node={node}/>), [v2Sets.nodes])
  // 所有节点的 ID
  const ids = React.useMemo(() => v2Sets.nodes?.map(node => node.name), v2Sets.nodes)

  // 按住一会才触发拖动。避免影响元素本身的点击事件
  const sensors = useSensors(useSensor(PointerSensor, {
    activationConstraint: {
      delay: 200,
      tolerance: 0,
    }
  }))

  // 初始化
  const init = async () => {
    let storage = await chrome.storage.sync.get({[CS_KEY_V2EX_TOPICS]: {}})
    let sets: V2exSets = storage[CS_KEY_V2EX_TOPICS]
    // 不能直接赋值，因为最初没有在 chromium storage 中存值，其值为空，所有要判断
    if (sets.nodes) {
      setV2Sets(sets)
    }
  }

  useEffect(() => {
    init()
  }, [])

  return (
    <Stack>
      <Divider>关注的节点（可拖动，即时生效）</Divider>
      <Stack gap={2} marginTop={2} flexDirection={"row"} flexWrap={"wrap"}>
        {
          !v2Sets.nodes?.length ? <h3>还没有收藏节点</h3> :
            <DndContext onDragEnd={onDragEnd} sensors={sensors}>
              <SortableContext items={ids || []}>{nodes}</SortableContext>
            </DndContext>
        }

        <DoTextFieldBtn label={"节点名，如'qna'"} clearAfterEnter size={"small"}
                        enterNode={"添加节点"} onEnter={onAddNode}/>
      </Stack>

      <Divider sx={{marginTop: 2, marginBottom: 2}}>其它设置</Divider>
      <DoPasswdField label={"Token"} value={v2Sets.token || ""}
                     placeholder={"访问 V2ex API 的 Token，在网站 设置 > Tokens 中生成"}
                     setObject={value => setV2Sets(prev => ({...prev, token: value}))}/>

      {/* 保存按钮 */
      }
      <Stack direction={"row"} justifyContent={"space-between"} marginTop={2}>
        <Button color={"inherit"} onClick={() => props.showDialog({open: false})}>取消</Button>

        <Button onClick={() => {
          if (!v2Sets.token) {
            showSb({open: true, severity: "info", message: "输入的内容为空"})
            return
          }

          chrome.storage.sync.set({[CS_KEY_V2EX_TOPICS]: v2Sets}).then(() => {
            console.log("已存储设置的数据")
            props.showDialog({open: false})
            showSb({open: true, message: "已存储设置的数据", severity: "success"})
          })
        }}>保存</Button>
      </Stack>
    </Stack>
  )
})

export default V2exSettings