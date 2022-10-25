import {anchor} from "./libs/anchors"
import {
  delRevokeArray,
  DoListAdd,
  DoLItemProps,
  DoOptionsInputProps,
  DoSnackbarProps,
  useSharedSnackbar
} from "do-comps"
import React, {useEffect, useState} from "react"
import Button from "@mui/material/Button"
import {insertOrdered} from "do-utils"
import type {AItemType} from "./attentions"
import type {SxProps, Theme} from "@mui/material"
import {IconButton, Switch} from "@mui/material"
import Stack from "@mui/material/Stack"
import HighlightOffOutlinedIcon from '@mui/icons-material/HighlightOffOutlined'
import Typography from "@mui/material/Typography"

// 排序规则
const sortRules: Function[] = [anchor.Sorts.isMarked]

// 删除项目
const handleDel = async (basic: anchor.Basic,
                         props: DoLItemProps,
                         showSb: (ps: DoSnackbarProps) => void,
                         setInfos: React.Dispatch<React.SetStateAction<DoLItemProps[]>>) => {
  // 读取存储的数据
  let data = await chrome.storage.sync.get({attentions: {anchors: {}}})
  let anchorsData: AItemType<anchor.Basic> = data.attentions.anchors

  delRevokeArray<anchor.Basic, DoLItemProps>(
    `主播：${basic.plat} ${basic.id}`, showSb, basic, anchorsData.list,
    (d1, d2) => d1.plat === d2.plat && d1.id === d2.id,
    async newDataList => {
      // 保存到存储
      let data = await chrome.storage.sync.get({attentions: {anchors: {}}})
      let anchors: AItemType<anchor.Basic> = data.attentions.anchors
      anchors.list = newDataList
      await chrome.storage.sync.set({attentions: data.attentions})
    },
    props, setInfos, (m1, m2) => m1.id === m2.id
  )
}

// 获取某个主播的信息
const getAnchorInfo = async (basic: anchor.Basic,
                             setInfos: React.Dispatch<React.SetStateAction<DoLItemProps[]>>,
                             showSb: (ps: DoSnackbarProps) => void,
                             isNewAdded?: boolean): Promise<DoLItemProps> => {
  const status: anchor.Status = await anchor.StatusUtils[basic.plat].check(basic)

  let props: DoLItemProps = {
    id: `${basic.plat}_${basic.id}`,
    avatar: status.avatar,
    divider: true,
    isMarked: status.online === 1,
    isNewAdded: isNewAdded,
    primary: <Button color={"inherit"} href={status.liveUrl} target="_blank"
                     sx={{padding: 0, margin: 0, minWidth: 0}}>{status.name}</Button>,
    secondary: <p className={"overflow-hide-line-one"} title={status.title}>{status.title}</p>,
    extra: <Stack>
      <IconButton title={"删除"} onClick={_ => handleDel(basic, props, showSb, setInfos)}>
        <HighlightOffOutlinedIcon opacity={0.3}/>
      </IconButton>
    </Stack>
  }

  return props
}

// 主播列表组件
const Anchors = (props: { sx?: SxProps<Theme> }): JSX.Element => {
  // 主播信息，用于显示
  const [infos, setInfos] = useState<Array<DoLItemProps>>([])

  // 通知、准许的开关
  const [swEnable, setSwEnable] = useState(true)
  const [swNo, setSwNo] = useState(true)

  // 显示消息
  const {showSb} = useSharedSnackbar()

  // 增加新主播
  const onAdd = async (value: string, plat: anchor.Plat) => {
    // 判断新项的数据是否完整
    if (value === "") {
      showSb({open: true, message: "无法添加主播：ID、房间号为空", severity: "info"})
      return
    }

    // 新项
    let basic = new anchor.Basic({id: value, plat: plat})

    // 准备保存到存储
    let data = await chrome.storage.sync.get({attentions: {anchors: {}}})
    let anchors: AItemType<anchor.Basic> = data.attentions.anchors
    // 当扩展刚安装而没有数据时，需要添加`list`属性
    if (!anchors.list) {
      anchors.list = []
    }
    // 是否已存在该项
    if (anchors.list.find(d1 => basic.id === d1.id && basic.plat === d1.plat)) {
      showSb({open: true, severity: "info", message: "该主播已存在，不需重复添加"})
      return
    }

    // 保存到存储
    anchors.list.push(basic)
    chrome.storage.sync.set({attentions: data.attentions})
    console.log("已添加主播", basic)
    showSb({open: true, severity: "success", message: "已添加主播"})

    // 获取信息详情以显示
    let props = await getAnchorInfo(basic, setInfos, showSb, true)
    setInfos(oldArray => insertOrdered(oldArray, props, sortRules))
  }

  // 添加面板的属性
  const inputProps: DoOptionsInputProps = {
    enterNode: "添加",
    onEnter: (value, sList) => onAdd(value, sList[0] as anchor.Plat),
    optionsList: [{
      label: "平台",
      options: [
        {title: "虎牙", value: "huya"},
        {title: "斗鱼", value: "douyu"},
        {title: "哔哩", value: "bili", tip: "主播的 UID，不是房间号"},
        {title: "抖音", value: "douyin", tip: "主播的 直播间号(如'6959169539363949319')，不是抖音号、ID"}
      ]
    }],
    placeholder: "主播的 ID、房间号",
    size: "small"
  }

  useEffect(() => {
    const init = async () => {
      // 读取存储的数据
      let data = await chrome.storage.sync.get({attentions: {anchors: {}}})
      let anchors: AItemType<anchor.Basic> = data.attentions.anchors

      // 设置界面的值
      setSwEnable(anchors.enable !== false)
      setSwNo(anchors.enableNotify !== false)

      // 获取状态并显示
      anchors.list?.map(async basic => {
        getAnchorInfo(basic, setInfos, showSb).then(props =>
          setInfos(oldArray => insertOrdered(oldArray, props, sortRules)))
      })
    }

    // 初始化
    init()
  }, [])

  return (
    <DoListAdd list={infos} title={"主播"} inputProps={inputProps} sx={props.sx} slot={
      <Stack direction={"row"}>
        <Switch title="准许检测" checked={swEnable} onChange={async event => {
          setSwEnable(event.target.checked)
          // 读取存储的数据
          let data = await chrome.storage.sync.get({attentions: {anchors: {}}})
          let anchors: AItemType<anchor.Basic> = data.attentions.anchors
          anchors.enable = event.target.checked
          await chrome.storage.sync.set({attentions: data.attentions})
          showSb({open: true, severity: "success", message: "已保存设置"})
        }}
        />

        <Switch title="准许通知" checked={swNo} onChange={async event => {
          setSwNo(event.target.checked)
          // 读取存储的数据
          let data = await chrome.storage.sync.get({attentions: {anchors: {}}})
          let anchors: AItemType<anchor.Basic> = data.attentions.anchors
          anchors.enableNotify = event.target.checked
          await chrome.storage.sync.set({attentions: data.attentions})
          showSb({open: true, severity: "success", message: "已保存设置"})
        }}
        />
      </Stack>}
    />
  )
}

export default Anchors