import React, {useEffect, useState} from "react"
import {request, sha256, insertOrdered} from "do-utils"
import {clearProcess, sites, startDLPics, startRetry} from "./task"
import IconButton from "@mui/material/IconButton"
import Switch from "@mui/material/Switch"
import type {SxProps, Theme} from "@mui/material"
import {
  delRevokeArray,
  DoListAdd,
  DoLItemProps,
  DoOptionsInputProps, DoPanel, DoPanelContent, DoPanelFooter, DoPanelHeader,
  DoSnackbarProps, DoTextTitle,
  useSharedSnackbar
} from "do-comps"
import Stack from "@mui/material/Stack"
import Button from "@mui/material/Button"
import HighlightOffOutlinedIcon from '@mui/icons-material/HighlightOffOutlined'
import FormatColorResetOutlinedIcon from '@mui/icons-material/FormatColorResetOutlined'
import CloudDownloadOutlinedIcon from '@mui/icons-material/CloudDownloadOutlined'
import Alert from "@mui/material/Alert"
import Divider from "@mui/material/Divider"
import Typography from "@mui/material/Typography"
import RefreshOutlinedIcon from '@mui/icons-material/RefreshOutlined'
import type {pstatus} from "./types"
import type {ptask} from "./types"

// 存储的 VPS 信息的类型
type VPSInfo = { domain: string, auth: string }

// 删除项目
const handleDel = async (task: ptask.Task,
                         props: DoLItemProps,
                         showSb: (ps: DoSnackbarProps) => void,
                         setInfos: React.Dispatch<React.SetStateAction<DoLItemProps[]>>) => {
  // 读取存储的数据
  let data = await chrome.storage.sync.get({picTasks: {list: []}})
  let picTasks: ptask.PicTasks = data.picTasks

  delRevokeArray<ptask.Task, DoLItemProps>(
    `任务：${task.plat} ${task.id}`, showSb, task, picTasks.list || [],
    (d1, d2) => d1.plat === d2.plat && d1.id === d2.id,
    async newDataList => {
      // 保存到存储
      await chrome.storage.sync.set({picTasks: {list: newDataList}})
    },
    props, setInfos, (m1, m2) => m1.id === m2.id
  )
}

// 获取某个任务的信息
const getTaskInfo = async (task: ptask.Task,
                           setInfos: React.Dispatch<React.SetStateAction<Array<DoLItemProps>>>,
                           showSb: (ps: DoSnackbarProps) => void,
                           isNewAdded?: boolean): Promise<DoLItemProps> => {
  const info: ptask.TaskInfo = await sites[task.plat].check(task)

  let props: DoLItemProps = {
    id: `${task.plat}_${task.id}`,
    avatar: info.avatar,
    divider: true,
    isMarked: false,
    isNewAdded: isNewAdded,
    primary: <Button color={"inherit"} href={sites[task.plat].getURL(task)} target="_blank"
                     sx={{padding: 0, margin: 0, minWidth: 0}}>{info.name}</Button>,
    secondary: <p className={"overflow-hide-line-one"} title={info.description}>{info.description}</p>,
    extra: <Stack>
      <IconButton title={"删除"} onClick={_ => handleDel(task, props, showSb, setInfos)}>
        <HighlightOffOutlinedIcon opacity={0.3}/>
      </IconButton>
    </Stack>
  }

  return props
}

// 远程服务端的状态组件
const Remote = (props: { sx?: SxProps<Theme> }): JSX.Element => {
  // 域名、连接状态
  const [vps, setVps] = useState<VPSInfo>({domain: "", auth: ""})

  const [connOK, setConnOK] = useState<boolean | undefined>(undefined)

  // 状态记录
  const [statusMap, setStatusMap] = useState<{ [id: string]: pstatus.StatusType }>({})
  // 需要重试下载的图集数
  const [totalCount, setTotalCount] = useState<pstatus.TotalCount>({fail: 0, skip: 0})
  // 用于刷新组件
  const [count, setCount] = useState(0)

  // 发送消息
  const {showSb} = useSharedSnackbar()

  // 生成请求头
  const genHeaders = React.useCallback(async (auth: string, t: number) => new Headers({
    t: t.toString(),
    s: (await sha256(auth + t + auth))
  }), [])

  // 初始化
  const init = async () => {
    // 从设置中读取服务端信息
    let dataSettings = await chrome.storage.sync.get({settings: {vps: {}}})
    let vps = dataSettings.settings.vps
    if (!vps.domain || !vps.auth) {
      console.log("VPS 服务端信息为空，无法连接到服务端")
      showSb({open: true, severity: "info", message: "VPS 服务端信息为空"})
      return
    }

    // 配置服务端域名
    setVps(vps)
  }

  // 获取数据
  const getData = async (vpsInfo: VPSInfo) => {
    // 更新连接服务端的状态
    // 操作授权码
    let headers = await genHeaders(vpsInfo.auth, Date.now())

    let resp = await request(`${vpsInfo.domain}/api/pics/dl/status`,
      undefined, {headers: headers}).catch((e) => {
      console.error("连接服务端出错，网络错误：", e)
      showSb({open: true, severity: "error", message: "连接服务端出错，网络错误"})
      setConnOK(false)
    })
    if (!resp) return

    let obj = await resp.json().catch((e) => {
      console.error("服务端响应的内容有误：", e)
      showSb({open: true, severity: "error", message: "连接服务端出错，无法解析响应内容"})
      setConnOK(false)
    })
    if (!obj) return

    setConnOK(obj?.code === 0)
    if (obj?.code === 0) {
      setStatusMap(obj.data)
    }

    // 获取任务失败的数量
    // 获取需要重试的图集数
    request(`${vpsInfo.domain}/api/pics/dl/count`,
      undefined, {headers: headers}).then(resp => resp.json()).then(obj => {
      if (obj?.code === 0) {
        setTotalCount(obj.data)
      }
    })
  }

  useEffect(() => {
    init()
  }, [])

  useEffect(() => {
    if (vps.auth === "" || vps.domain === "") return

    getData(vps)
  }, [vps, count])

  // 生成任务的状态
  let statusElems: Array<JSX.Element> = []
  for (const [id, s] of Object.entries(statusMap)) {
    statusElems.push(
      <li key={id}>
        <Stack spacing={1}>
          <Typography>共有 {s.total} 个，发送 {s.done} 个</Typography>
          <Typography>跳过 {s.skip} 个，失败 {s.fail} 个</Typography>
        </Stack>
      </li>
    )
  }

  return (
    <DoPanel sx={props.sx} divider={<Divider/>}>
      <DoPanelHeader>
        <DoTextTitle>服务端状态</DoTextTitle>

        <Stack direction={"row"} alignItems={"center"} gap={1}>
          <IconButton title="刷新" onClick={() => setCount(prev => ++prev)}>
            <RefreshOutlinedIcon/>
          </IconButton>

          <Typography title="服务端的连接状态"
                      color={connOK === true ? "#52C41A" : connOK === false ? "#FF0000" : "inherit"}>
            {connOK === true ? "正常" : connOK === false ? "错误" : "获取"}
          </Typography>
        </Stack>
      </DoPanelHeader>

      <DoPanelContent padding={2} alignItems={"stretch"}>
        <Divider>本次</Divider>
        {statusElems.length !== 0 ? <ul>{statusElems}</ul> : <Alert severity="info">没有进行中的任务</Alert>}

        <Divider sx={{marginTop: 2}}>总共</Divider>
        <Typography>失败 {totalCount.fail} 个，跳过 {totalCount.skip} 个</Typography>

        <Divider sx={{marginTop: 2}}/>
        {/*<Button title="查看服务端的下载状态" onClick={() => {*/}
        {/*  window.open(`${domain}/#/tasks`, "_blank")*/}
        {/*}}>查看进度</Button>*/}

        <Button title="重试下载失败的图集" onClick={() => startRetry(showSb)}>重试失败</Button>
      </DoPanelContent>
    </DoPanel>
  )
}

// 图片的平台、ID 组件
const PicTasksComp = (): JSX.Element => {
  // 任务信息，用于显示
  const [infos, setInfos] = useState<Array<DoLItemProps>>([])
  // 是否正在获取图集信息，用于禁用下载按钮
  const [working, setWorking] = useState(false)

  // 通知、准许的开关
  const [swEnable, setSwEnable] = useState(true)

  // 显示消息
  const {showSb} = useSharedSnackbar()

  // 增加新任务
  const onAdd = async (value: string, plat: ptask.Plat) => {
    // 判断新项的数据是否完整
    if (value === "") {
      showSb({open: true, message: "无法添加任务：用户ID 为空", severity: "info"})
      return
    }

    // 新项
    let task: ptask.Task = {plat: plat, id: value}

    // 准备保存到存储
    let data = await chrome.storage.sync.get({picTasks: {}})
    let picTasks: ptask.PicTasks = data.picTasks

    // 当扩展刚安装而没有数据时，需要添加`list`属性
    if (!picTasks.list) {
      picTasks.list = []
    }
    // 是否已存在该项
    if (picTasks.list.find(d1 => task.id === d1.id && task.plat === d1.plat)) {
      showSb({open: true, severity: "info", message: "该图集任务已存在，不需重复添加"})
      return
    }

    // 保存到存储
    picTasks.list.push(task)
    chrome.storage.sync.set({picTasks: picTasks})
    console.log("已添加图集任务", picTasks)
    showSb({open: true, severity: "success", message: "已添加图集任务"})

    // 获取信息详情以显示
    let props = await getTaskInfo(task, setInfos, showSb, true)
    setInfos(oldArray => insertOrdered(oldArray, props, []))
  }

  // 添加面板的属性
  const inputProps: DoOptionsInputProps = {
    enterNode: "添加",
    onEnter: (value, sList) => onAdd(value, sList[0] as ptask.Plat),
    optionsList: [{
      label: "平台",
      options: [
        {title: "微博", value: "weibo", tip: "用户 ID"},
      ]
    }],
    placeholder: "用户 ID",
    size: "small"
  }

  useEffect(() => {
    document.title = `图片下载 - ${chrome.runtime.getManifest().name}`

    const init = async () => {
      let data = await chrome.storage.sync.get({picTasks: {}})
      let picTasks: ptask.PicTasks = data.picTasks

      // 设置界面的值
      setSwEnable(picTasks.enable !== false)

      // 获取状态并显示
      picTasks.list?.map(async task => {
        getTaskInfo(task, setInfos, showSb).then(props =>
          setInfos(oldArray => insertOrdered(oldArray, props, [])))
      })
    }

    // 执行
    init()
  }, [])

  return (
    <Stack direction={"row"} spacing={4}>
      <DoListAdd sx={{width: 400}} list={infos} title={"图集下载"} inputProps={inputProps} slot={
        <Stack direction={"row"}>
          <IconButton title="删除进度" onClick={() => clearProcess(showSb)}>
            <FormatColorResetOutlinedIcon/>
          </IconButton>

          <IconButton title="下载图集" disabled={working} onClick={() => startDLPics(setWorking, showSb)}>
            <CloudDownloadOutlinedIcon/>
          </IconButton>

          <Switch title="准许检测" checked={swEnable}
                  onChange={async event => {
                    setSwEnable(event.target.checked)
                    // 读取存储的数据
                    let data = await chrome.storage.sync.get({picTasks: {}})
                    let picTasks: ptask.PicTasks = data.picTasks
                    picTasks.enable = event.target.checked
                    await chrome.storage.sync.set({picTasks: picTasks})
                    showSb({open: true, message: "已保存设置"})
                  }}
          />
        </Stack>}
      />

      <Remote sx={{width: 400}}/>
    </Stack>
  )
}

export default PicTasksComp
