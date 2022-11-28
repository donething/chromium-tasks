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
export type V2exSets = {
  token: string
  nodes: { [key: string]: string }
}
// 初始值
const initValue: V2exSets = {nodes: {}, token: ""}

/**
 * V2ex 的设置面板
 */
const V2exSettings = React.memo((props: { showDialog: (ps: DoDialogProps) => void }): JSX.Element => {
  const [sets, setSets] = useState(initValue)
  // 显示消息
  const {showSb} = useSharedSnackbar()

  const onAddNode = React.useCallback(async (name: string) => {
    // 根据节点名联网获取节点标题
    let node = await get<Node>(`https://www.v2ex.com/api/v2/nodes/${name}`, undefined, showSb)
    if (!node) {
      showSb({open: true, message: "无法读取节点的信息，可以查看控制台", severity: "error"})
      return
    }

    // 更新界面
    setSets(prev => {
      let nodes = {...prev.nodes}
      nodes[name] = node?.title!!
      return {...prev, nodes}
    })

    // 存储
    let storage = await chrome.storage.sync.get({[CS_KEY_V2EX_TOPICS]: {}})
    let sets: V2exSets = storage[CS_KEY_V2EX_TOPICS]
    sets.nodes[name] = node.title
    chrome.storage.sync.set({[CS_KEY_V2EX_TOPICS]: sets})
  }, [])

  const onDelNode = React.useCallback((name: string, title: string) => {
    delRevoke(`节点'${title}'`, sets, async () => {
      setSets(prev => {
        let {[name]: title, ...nodes} = prev.nodes
        return {...prev, nodes}
      })

      let storage = await chrome.storage.sync.get({[CS_KEY_V2EX_TOPICS]: {}})
      let sets: V2exSets = storage[CS_KEY_V2EX_TOPICS]
      let {[name]: title, ...nodes} = sets.nodes
      sets.nodes = nodes
      chrome.storage.sync.set({[CS_KEY_V2EX_TOPICS]: sets})
    }, async (origin) => {
      setSets(prev => {
        let nodes = {...prev.nodes}
        nodes[name] = title
        return {...prev, nodes}
      })

      let storage = await chrome.storage.sync.get({[CS_KEY_V2EX_TOPICS]: {}})
      let sets: V2exSets = storage[CS_KEY_V2EX_TOPICS]
      sets.nodes[name] = title
      chrome.storage.sync.set({[CS_KEY_V2EX_TOPICS]: sets})
    }, showSb)
  }, [])

  // 显示所有节点
  const nodes = React.useMemo(() => {
    return Object.entries(sets.nodes).map(([name, title]) =>
      <Chip label={title} onDelete={() => onDelNode(name, title)}/>)
  }, [sets.nodes])

  // 初始化
  const init = async () => {
    let storage = await chrome.storage.sync.get({[CS_KEY_V2EX_TOPICS]: {}})
    let sets: V2exSets = storage[CS_KEY_V2EX_TOPICS]
    // 不能直接赋值，因为最初没有在 chromium storage 中存值，其值为空，所有要判断
    if (sets.nodes) {
      setSets(sets)
    }
  }

  useEffect(() => {
    init()
  }, [])

  return (
    <Stack spacing={4} paddingTop={1}>
      <DoPasswdField label={"Token"} value={sets.token}
                     placeholder={"访问 V2ex API 的 Token，在网站 设置 > Tokens 中生成"}
                     setObject={value => setSets(prev => ({...prev, token: value}))}/>

      <Divider>关注的节点</Divider>
      <Stack marginTop={0}>
        <Stack direction={"row"} flexWrap={"wrap"} gap={1} marginBottom={2}>{nodes}</Stack>
        <DoTextFieldBtn label={"节点名，如'qna'"} clearAfterEnter size={"small"}
                        enterNode={"添加节点"} onEnter={onAddNode}/>
      </Stack>

      {/* 保存按钮 */}
      <Stack direction={"row"} justifyContent={"space-between"}>
        <Button color={"inherit"} onClick={() => props.showDialog({open: false})}>取消</Button>

        <Button onClick={() => {
          if (!sets.token) {
            showSb({open: true, severity: "info", message: "输入的内容为空"})
            return
          }

          chrome.storage.sync.set({[CS_KEY_V2EX_TOPICS]: sets}).then(() => {
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