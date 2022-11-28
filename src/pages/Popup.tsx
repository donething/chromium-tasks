import React, {useEffect} from 'react'
import Stack from "@mui/material/Stack"
import Button from "@mui/material/Button"
import IconAttention from "../icons/attention.svg"
import IconV2ex from "../icons/letter_v.svg"
import IconMatches from "../icons/matches.svg"
import IconTasks from "../icons/tasks.svg"
import IconPics from "../icons/pic.svg"
import IconZuji from "../icons/foot.svg"
import IconOptions from "../icons/options.svg"
import IconDYS from "../icons/dys.svg"
import {SvgIcon} from "@mui/material"

// 弹出窗
const Popup = () => {
  useEffect(() => {
    document.title = `弹出框 - ${chrome.runtime.getManifest().name}`
  }, [])

  return (
    <Stack width={80}>
      <Button startIcon={<SvgIcon component={IconAttention} viewBox={"0 0 1024 1024"}/>}
              onClick={() => chrome.tabs.create({url: "/index.html#/attentions"})}>关注
      </Button>

      <Button startIcon={<SvgIcon component={IconV2ex} viewBox={"0 0 1024 1024"}/>}
              onClick={() => chrome.tabs.create({url: "/index.html#/v2ex"})}>V2ex
      </Button>

      <Button startIcon={<SvgIcon component={IconMatches} viewBox={"0 0 1024 1024"}/>}
              onClick={() => chrome.tabs.create({url: "/index.html#/matches"})}>赛程
      </Button>

      <Button startIcon={<SvgIcon component={IconDYS} viewBox={"0 0 1024 1024"}/>}
              onClick={() => chrome.tabs.create({url: "/index.html#/dys"})}>德云
      </Button>

      <Button startIcon={<SvgIcon component={IconZuji} viewBox={"0 0 1024 1024"}/>}
              onClick={() => chrome.tabs.create({url: "/index.html#/zuji"})}>足迹
      </Button>

      <Button startIcon={<SvgIcon component={IconPics} viewBox={"0 0 1024 1024"}/>}
              onClick={() => chrome.tabs.create({url: "/index.html#/pic_tasks"})}>图集
      </Button>

      <Button startIcon={<SvgIcon component={IconTasks} viewBox={"0 0 1024 1024"}/>}
              onClick={() => chrome.tabs.create({url: "/index.html#/tasks"})}>任务
      </Button>

      <Button startIcon={<SvgIcon component={IconOptions} viewBox={"0 0 1024 1024"}/>}
              onClick={() => chrome.tabs.create({url: "/index.html#/options"})}>选项
      </Button>
    </Stack>
  )
}

export default Popup
