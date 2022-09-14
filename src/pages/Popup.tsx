import React, {useEffect} from 'react'
import Stack from "@mui/material/Stack"
import Button from "@mui/material/Button"
import IconAttention from "../icons/attention.svg"
import IconMatches from "../icons/matches.svg"
import IconTasks from "../icons/tasks.svg"
import IconPics from "../icons/pic.svg"
import IconZuji from "../icons/foot.svg"
import IconOptions from "../icons/options.svg"
import IconDYS from "../icons/dys.svg"
import {DoSvgIcon} from "do-comps"

// 弹出窗
const Popup = () => {
  useEffect(() => {
    document.title = `弹出框 - ${chrome.runtime.getManifest().name}`
  }, [])

  return (
    <Stack width={100}>
      <Button startIcon={<DoSvgIcon svg={IconAttention}/>}
              onClick={() => chrome.tabs.create({url: "/index.html#/attentions"})}>关注
      </Button>

      <Button startIcon={<DoSvgIcon svg={IconMatches}/>}
              onClick={() => chrome.tabs.create({url: "/index.html#/matches"})}>赛程
      </Button>

      <Button startIcon={<DoSvgIcon svg={IconTasks}/>}
              onClick={() => chrome.tabs.create({url: "/index.html#/tasks"})}>任务
      </Button>

      <Button startIcon={<DoSvgIcon svg={IconPics}/>}
              onClick={() => chrome.tabs.create({url: "/index.html#/pic_tasks"})}>图集
      </Button>

      <Button startIcon={<DoSvgIcon svg={IconZuji}/>}
              onClick={() => chrome.tabs.create({url: "/index.html#/zuji"})}>足迹
      </Button>

      <Button startIcon={<DoSvgIcon svg={IconOptions}/>}
              onClick={() => chrome.tabs.create({url: "/index.html#/options"})}>选项
      </Button>

      <Button startIcon={<DoSvgIcon svg={IconDYS}/>}
              onClick={() => chrome.tabs.create({url: "/index.html#/dys"})}>德云
      </Button>
    </Stack>
  )
}

export default Popup
