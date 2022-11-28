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
import {app} from "./libs/apps"
import type {SxProps, Theme} from "@mui/material"
import Stack from "@mui/material/Stack"
import HighlightOffOutlinedIcon from '@mui/icons-material/HighlightOffOutlined'
import {IconButton, Switch} from "@mui/material"
import Typography from "@mui/material/Typography"

// 样式
const sxOneLine: SxProps<Theme> = {
  display: "block",
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap"
}

// 排序规则
const sortRules: Function[] = [app.Sorts.isMarked, app.Sorts.id]

// 删除项目
const handleDel = async (basic: app.Basic, props: DoLItemProps,
                         showSb: (ps: DoSnackbarProps) => void,
                         setInfos: React.Dispatch<React.SetStateAction<DoLItemProps[]>>) => {
  // 读取存储的数据
  let data = await chrome.storage.sync.get({attentions: {apps: {}}})
  let appsData: AItemType<app.Basic> = data.attentions.apps

  delRevokeArray<app.Basic, DoLItemProps>(
    `应用：${basic.plat} ${basic.area} ${basic.id}`, showSb, basic, appsData.list,
    (d1, d2) => d1.plat === d2.plat && d1.area === d2.area && d1.id === d2.id,
    async newDataList => {
      // 保存到存储
      let data = await chrome.storage.sync.get({attentions: {apps: {}}})
      let apps: AItemType<app.Basic> = data.attentions.apps
      apps.list = newDataList
      await chrome.storage.sync.set({attentions: data.attentions})
    },
    props, setInfos, (m1, m2) => m1.id === m2.id
  )
}

// 获取某个应用的信息
const getAppInfo = async (basic: app.Basic,
                          setInfos: React.Dispatch<React.SetStateAction<DoLItemProps[]>>,
                          showSb: (ps: DoSnackbarProps) => void,
                          isNewAdded?: boolean): Promise<DoLItemProps> => {
  const status: app.Status = await app.StatusUtils[basic.plat].check(basic)
  let props: DoLItemProps = {
    id: `${basic.plat}_${basic.area}_${basic.id}`,
    avatar: status.icon || "",
    divider: true,
    isMarked: status.price === 0,
    isNewAdded: isNewAdded,
    primary: <Stack direction={"row"} justifyContent={"space-between"}>
      <Button color={"inherit"} href={status.viewURL || ""} target="_blank"
              sx={{padding: 0, margin: 0, ...sxOneLine}}>{status.name}</Button>
      <Typography sx={{color: "#888"}}>{status.formattedPrice}</Typography>
    </Stack>,
    secondary: <p className={"line-1"} title={status.description}>{status.description}</p>,
    extra: <Stack>
      <IconButton title={"删除"} onClick={_ => handleDel(basic, props, showSb, setInfos)}>
        <HighlightOffOutlinedIcon opacity={0.3}/>
      </IconButton>
    </Stack>
  }

  return props
}

// 应用列表组件
const Apps = (props: { sx?: SxProps<Theme> }): JSX.Element => {
  // 应用信息，用于显示
  const [infos, setInfos] = useState<Array<DoLItemProps>>([])

  // 通知、准许的开关
  const [swEnable, setSwEnable] = useState(true)

  // 显示消息
  const {showSb} = useSharedSnackbar()

  // 增加应用
  const onAdd = async (value: string, plat: app.Plat, area: app.Area) => {
    // 判断新项的数据是否完整
    if (value === "") {
      showSb({open: true, message: "无法添加应用：应用 ID、包名为空", severity: "info"})
      return
    }

    // 新项
    let basic = new app.Basic({id: value, plat: plat, area: area})

    // 准备保存到存储
    let data = await chrome.storage.sync.get({attentions: {apps: {}}})
    let apps: AItemType<app.Basic> = data.attentions.apps
    // 当扩展刚安装而没有数据时，需要添加`list`属性
    if (!apps.list) {
      apps.list = []
    }
    // 是否已存在该项
    if (apps.list.find(d1 => basic.id === d1.id && basic.plat === d1.plat && basic.area === d1.area)) {
      showSb({open: true, severity: "info", message: "该应用已存在，不需重复添加"})
      return
    }

    // 保存到存储
    apps.list.push(basic)
    chrome.storage.sync.set({attentions: data.attentions})
    console.log("已添加应用", basic)
    showSb({open: true, severity: "success", message: "已添加应用"})

    // 获取信息详情以显示
    let props = await getAppInfo(basic, setInfos, showSb, true)
    setInfos(oldArray => insertOrdered(oldArray, props, sortRules))
  }

  // 添加面板的属性
  const inputProps: DoOptionsInputProps = {
    enterNode: "添加",
    onEnter: (value, sList) => onAdd(value, sList[0] as app.Plat, sList[1] as app.Area),
    optionsList: [{
      label: "平台",
      options: [
        {title: "AppStore", value: "appstore", tip: "应用的 ID，前面不需要'id'"},
        {title: "PlayStore", value: "playstore", tip: "应用的 包名"}
      ]
    }, {
      label: "地区",
      options: [
        {title: "CN", value: "CN"},
        {title: "US", value: "US"}
      ]
    }],
    placeholder: "应用的 ID、包名",
    size: "small"
  }

  useEffect(() => {
    const init = async () => {
      // 读取存储的数据
      let data = await chrome.storage.sync.get({attentions: {apps: {}}})
      let apps: AItemType<app.Basic> = data.attentions.apps

      // 设置界面的值
      setSwEnable(apps.enable !== false)

      // 获取状态并显示
      apps.list?.map(async basic => {
        getAppInfo(basic, setInfos, showSb).then(props =>
          setInfos(oldArray => insertOrdered(oldArray, props, sortRules)))
      })
    }

    // 初始化
    init()
  }, [])

  return (
    <DoListAdd list={infos} title={"应用"} inputProps={inputProps} sx={props.sx} slot={<Stack direction={"row"}>
      <Switch title="准许检测" checked={swEnable}
              onChange={async event => {
                setSwEnable(event.target.checked)
                // 读取存储的数据
                let data = await chrome.storage.sync.get({attentions: {apps: {}}})
                let apps: AItemType<app.Basic> = data.attentions.apps
                apps.enable = event.target.checked
                await chrome.storage.sync.set({attentions: data.attentions})
                showSb({open: true, severity: "success", message: "已保存设置"})
              }}
      />
    </Stack>}/>
  )
}

export default Apps