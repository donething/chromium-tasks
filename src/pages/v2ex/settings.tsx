import React, {useEffect, useState} from "react"
import {delRevoke, DoDialogProps, DoPasswdField, DoTextFieldBtn, useSharedSnackbar} from "do-comps"
import Stack from "@mui/material/Stack"
import Button from "@mui/material/Button"
import {Chip, Divider} from "@mui/material"
import {get} from "./comm"
import type {Node} from "./types"

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
  const save = React.useCallback(async (newItem: V2exNodeItem) => {
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

    await save(newItem)
  }, [v2Sets])

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
    }, () => save({name: name, title: title}), showSb)
  }, [v2Sets])

  // 显示所有节点
  const nodes = React.useMemo(() => {
    return v2Sets.nodes?.map(node =>
      <Chip label={node.title} onDelete={() => onDelNode(node.name, node.title)}/>)
  }, [v2Sets.nodes])

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
    <Stack spacing={4} paddingTop={1}>
      <Divider>关注的节点（即时生效）</Divider>
      <Stack marginTop={0}>
        <Stack direction={"row"} flexWrap={"wrap"} gap={1} marginBottom={2}>{nodes}</Stack>
        <DoTextFieldBtn label={"节点名，如'qna'"} clearAfterEnter size={"small"}
                        enterNode={"添加节点"} onEnter={onAddNode}/>
      </Stack>

      <DoPasswdField label={"Token"} value={v2Sets.token || ""}
                     placeholder={"访问 V2ex API 的 Token，在网站 设置 > Tokens 中生成"}
                     setObject={value => setV2Sets(prev => ({...prev, token: value}))}/>

      {/* 保存按钮 */}
      <Stack direction={"row"} justifyContent={"space-between"}>
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