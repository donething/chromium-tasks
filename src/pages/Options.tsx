import React, {useEffect, useState} from 'react'
import Card, {CardProps} from "@mui/material/Card"
import {CardHeader, TextField} from "@mui/material"
import CardContent from "@mui/material/CardContent"
import Button from "@mui/material/Button"
import {delRevoke, DoBackupPanelChromium, useSharedSnackbar} from "do-comps"
import CardActions from "@mui/material/CardActions"
import Stack from "@mui/material/Stack"
import Divider from "@mui/material/Divider"

// 微信 Token 的初始值
const wxTokenInit = {
  appid: "",
  secret: "",
  toUID: ""
}

// 微信 Token 组件
const WXToken = (props?: CardProps): JSX.Element => {
  // 需要保存的 token 信息
  const [wxToken, setWxToken] = useState(wxTokenInit)
  // 提示消息
  const {showSb} = useSharedSnackbar()

  // 仅在组件被导入时读取数据，组件有变动（重新渲染）时不执行
  useEffect(() => {
    // 读取存储的数据，显示
    chrome.storage.sync.get({settings: {}}).then(data => {
      console.log("读取存储的微信推送 Token")
      if (data.settings.wxToken) {
        setWxToken(data.settings.wxToken)
      }
    })
  }, [])

  return (
    <Card {...props}>
      <CardHeader title={"企业微信消息推送"}/>

      <Divider/>

      <CardContent>
        <TextField label="企业ID" type={"password"} value={wxToken.appid} size={"small"}
                   onChange={e => setWxToken(prev => ({...prev, appid: e.target.value}))}/>

        <TextField label="秘钥" type={"password"} value={wxToken.secret} size={"small"}
                   onChange={e => setWxToken(prev => ({...prev, secret: e.target.value}))}/>

        <TextField label="应用ID" type={"password"} value={wxToken.toUID} size={"small"}
                   onChange={e => setWxToken(prev => ({...prev, toUID: e.target.value}))}/>
      </CardContent>

      <Divider/>

      <CardActions>
        <Button color={"primary"} onClick={async _ => {
          if (!wxToken.appid || !wxToken.secret || !wxToken.toUID) {
            showSb({open: true, message: "微信 Token 中部分信息为空", severity: "warning"})
            return
          }

          let data = await chrome.storage.sync.get({settings: {}})
          data.settings.wxToken = wxToken

          await chrome.storage.sync.set({settings: data.settings})
          console.log("已保存 微信推送的 Token")
          showSb({open: true, message: "已保存 微信推送的 Token", severity: "success"})
        }}>保存 Token
        </Button>

        <Button color={"warning"} onClick={_ => {
          delRevoke<typeof wxTokenInit>("微信推送的Token", wxToken, async () => {
            // 删除输入框绑定的数据
            setWxToken(wxTokenInit)

            // 保存到 chromium storage
            let data = await chrome.storage.sync.get({settings: {}})
            data.settings.wxToken = undefined
            chrome.storage.sync.set({settings: data.settings}).then(() => {
              console.log("已删除 微信推送的 Token")
              showSb({open: true, message: "已删除 微信推送的 Token", severity: "success"})
            })
          }, async origin => {
            // 撤销删除
            // 恢复输入框绑定的数据
            setWxToken(origin)

            // 恢复数据到 chromium storage 中
            let data = await chrome.storage.sync.get({settings: {}})
            data.settings.wxToken = origin
            chrome.storage.sync.set({settings: data.settings}, () => {
              console.log("已恢复 微信推送的 Token")
              showSb({open: true, message: "已恢复 微信推送的 Token", severity: "success"})
            })
          }, showSb)
        }}>删除 Token
        </Button>
      </CardActions>
    </Card>
  )
}

// VPS 信息的初始值
const vpsInfoInit = {domain: "", auth: ""}

// VPS 信息的组件
const VPS = (props?: CardProps): JSX.Element => {
  // VPS 的域名、验证码
  const [vpsInfo, setVPSInfo] = useState(vpsInfoInit)
  // 提示消息
  const {showSb} = useSharedSnackbar()

  // 仅在组件被导入时读取数据，组件有变动（重新渲染）时不执行
  useEffect(() => {
    // 读取存储的数据，显示
    chrome.storage.sync.get({settings: {vps: {}}}).then(data => {
      console.log("读取存储的 VPS 信息")
      if (data.settings.vps) {
        setVPSInfo(data.settings.vps)
      }
    })
  }, [])

  return (
    <Card {...props}>
      <CardHeader title={"VPS 信息"}/>

      <Divider/>

      <CardContent>
        <TextField label="域名" value={vpsInfo.domain} type={"password"} size={"small"}
                   onChange={e => setVPSInfo(prev => ({...prev, domain: e.target.value}))}/>
        <TextField label="操作码" value={vpsInfo.auth} type={"password"} size={"small"}
                   onChange={e => setVPSInfo(prev => ({...prev, auth: e.target.value}))}/>
      </CardContent>

      <Divider/>

      <CardActions>
        <Button color={"primary"} onClick={async _ => {
          if (!vpsInfo.domain || !vpsInfo.auth) {
            showSb({open: true, message: "VPS 信息中部分信息为空", severity: "warning"})
            return
          }

          let data = await chrome.storage.sync.get({settings: {}})
          data.settings.vps = vpsInfo
          chrome.storage.sync.set({settings: data.settings}, () => {
            console.log("已保存 VPS 信息")
            showSb({open: true, message: "已保存 VPS 信息", severity: "success"})
          })
        }}>保存信息
        </Button>

        <Button color={"warning"} onClick={_ => {
          delRevoke(`VPS 信息`, vpsInfo, async () => {
            // 删除输入框绑定的数据
            setVPSInfo(vpsInfoInit)

            // 保存到 chromium storage
            let data = await chrome.storage.sync.get({settings: {}})
            data.settings.vps = undefined
            chrome.storage.sync.set({settings: data.settings}).then(() => {
              console.log("已删除 VPS 信息")
              showSb({open: true, message: "已删除 VPS 信息", severity: "success"})
            })
          }, async origin => {
            // 撤销删除
            // 恢复输入框绑定的数据
            setVPSInfo(origin)

            // 恢复到 chromium storage
            let data = await chrome.storage.sync.get({settings: {}})
            data.settings.vps = origin
            chrome.storage.sync.set({settings: data.settings}, () => {
              console.log("已保存 VPS 信息")
              showSb({open: true, message: "已保存 VPS 信息", severity: "success"})
            })
          }, showSb)
        }}>删除信息
        </Button>
      </CardActions>
    </Card>
  )
}

// 选项组件
const Options = (): JSX.Element => {
  useEffect(() => {
    document.title = `选项 - ${chrome.runtime.getManifest().name}`
  }, [])

  return (
    <Stack direction={"row"} spacing={2}>
      <WXToken sx={{width: 300}}/>
      <VPS sx={{width: 300}}/>
      <DoBackupPanelChromium/>
    </Stack>
  )
}

export default Options
