import type {RoomStatus} from "./types"
import React, {Fragment, useEffect, useState} from "react"
import {getRoomsStatus} from "./task"
import Button from "@mui/material/Button"
import Stack from "@mui/material/Stack"
import {DoDialogProps, useSharedDialog, useSharedSnackbar, DoPanel, DoText} from "do-comps"
import TextField from "@mui/material/TextField"
import Card from "@mui/material/Card"
import {Avatar, CardHeader, IconButton} from "@mui/material"
import CardContent from "@mui/material/CardContent"
import PersonOutlinedIcon from '@mui/icons-material/PersonOutlined'
import AccessTimeOutlinedIcon from '@mui/icons-material/AccessTimeOutlined'
import PlayCircleFilledWhiteOutlinedIcon from '@mui/icons-material/PlayCircleFilledWhiteOutlined'
import ChatBubbleOutlineOutlinedIcon from '@mui/icons-material/ChatBubbleOutlineOutlined'
import PinDropOutlinedIcon from '@mui/icons-material/PinDropOutlined'
import ContentCopyOutlinedIcon from '@mui/icons-material/ContentCopyOutlined'
import CardActions from "@mui/material/CardActions"
import Alert from "@mui/material/Alert"
import Typography from "@mui/material/Typography"
import Divider from "@mui/material/Divider"

// localstorage 中保存用户 ssid 的键、网站域名的键
const LS_SSID = "ct_ssid"
export const LS_HOST = "host"

// 足迹设置面板
const ZJSettings = (props: { showDialog: (ps: DoDialogProps) => void }): JSX.Element => {
  const [ssid, setSsid] = useState("")
  const [host, setHost] = useState("")

  // 显示消息
  const {showSb} = useSharedSnackbar()

  useEffect(() => {
    setSsid(localStorage.getItem(LS_SSID) || "")
  }, [])

  return (
    <Stack spacing={2} paddingTop={1}>
      <TextField value={ssid} size={"small"} label={"用户的SSID"}
                 placeholder={"抓包获取 sessionid，网址如 /v2/recommendhotusers?sessionid=xxx"}
                 onChange={event => setSsid(event.target.value)}/>
      <TextField value={host} placeholder={"如 https://example.com"} label={"网站的域名"} size={"small"}
                 onChange={event => setHost(event.target.value)}/>

      <Stack direction={"row"} justifyContent={"space-between"}>
        <Button color={"inherit"} onClick={() => props.showDialog({open: false})}>取消</Button>

        <Button onClick={() => {
          if (!ssid || !host) {
            showSb({open: true, severity: "info", message: "用户SSID 或 网站域名 为空"})
            return
          }

          localStorage.setItem(LS_SSID, ssid)
          localStorage.setItem(LS_HOST, host)
          window.location.reload()
        }}>保存</Button>
      </Stack>
    </Stack>
  )
}

// 单个项目
const AnchorItem = (props: { room: RoomStatus }) => {
  // 显示消息
  const {showSb} = useSharedSnackbar()

  return (
    <Card sx={{width: 300}}>
      <CardHeader avatar={<Avatar sx={{width: 60, height: 60}} src={props.room.logourl}/>}
                  title={props.room.nickname}
                  titleTypographyProps={{fontSize: "large", noWrap: true}}
                  subheader={<DoText title={props.room.title} lines={2}>{props.room.title}</DoText>}
      />

      <Divider/>

      <CardContent>
        <Stack direction={"row"} spacing={1} alignItems={"center"}>
          <PersonOutlinedIcon/>
          <Typography>{props.room.watching_count} / {props.room.watch_count}</Typography>
        </Stack>

        <Stack direction={"row"} spacing={1} alignItems={"center"}>
          <AccessTimeOutlinedIcon/>
          <Typography>{props.room.live_start_time}</Typography>
        </Stack>
      </CardContent>

      <Divider/>

      <CardActions>
        <IconButton title={"调用播放器播放"} onClick={() => window.open(`potplayer://${props.room.play_url}`)}>
          <PlayCircleFilledWhiteOutlinedIcon/>
        </IconButton>

        <IconButton title={"复制直播地址"} onClick={() => {
          navigator.clipboard.writeText(props.room.play_url)
          showSb({open: true, severity: "success", message: "已复制主播的直播地址"})
        }}><ContentCopyOutlinedIcon/>
        </IconButton>

        <IconButton title={"浏览弹幕"} onClick={() => window.open(props.room.share_url)}>
          <ChatBubbleOutlineOutlinedIcon/>
        </IconButton>

        <IconButton title={"复制主播所在位置的经纬度"}
                    disabled={String(props.room.gps_longitude) === "0" && String(props.room.gps_latitude) === "0"}
                    onClick={() => {
                      navigator.clipboard.writeText(`${props.room.gps_longitude},${props.room.gps_latitude}`)
                      showSb({open: true, severity: "success", message: "已复制主播所在位置的经纬度"})
                    }}>
          <PinDropOutlinedIcon/>
        </IconButton>
      </CardActions>
    </Card>
  )
}

// 面板
export const Zuji = () => {
  // rooms 为 undefined 表示正在获取；[] 长度为 0 表示没有关注的主播在播
  const [rooms, setRooms] = useState<Array<RoomStatus> | undefined>(undefined)

  // 显示消息
  const {showSb} = useSharedSnackbar()
  const {showDialog} = useSharedDialog()

  useEffect(() => {
    document.title = `足迹直播 - ${chrome.runtime.getManifest().name}`

    let ssid = localStorage.getItem(LS_SSID)
    let host = localStorage.getItem(LS_HOST)
    if (!ssid || !host) {
      showSb({open: true, severity: "info", message: "用户SSID 或网站域名 为空，请先设置"})
      return
    }

    // 获取房间号
    getRoomsStatus(ssid, host, setRooms, showSb)
  }, [])

  return (
    <DoPanel isRow header={{
      title: `有 ${rooms?.length || 0} 个主播在线`, action: <Button onClick={_ => showDialog({
        open: true, title: "设置", content: <ZJSettings showDialog={showDialog}/>
      })}>设置</Button>
    }} content={
      <Fragment>
        {
          rooms === undefined ?
            <Alert severity="info">正在获取…</Alert> :
            rooms.length === 0 ?
              <Alert severity="info">没有关注的主播在线</Alert> :
              rooms.map(room => <AnchorItem key={room.name} room={room}/>)
        }
      </Fragment>} sxContent={{padding: 2}}
    />
  )
}
