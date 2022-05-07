import React, {useEffect, useState} from "react"
import type {CcmnnSets} from "./ccmnn"
import type {HdsaySets} from "./hdsay"
import Button from "@mui/material/Button"
import Card from "@mui/material/Card"
import CardContent from "@mui/material/CardContent"
import CardActions from "@mui/material/CardActions"
import Stack from "@mui/material/Stack"
import {CCmnn} from "./ccmnn"
import {useSharedSnackbar} from "do-comps"
import {Avatar, CardHeader} from "@mui/material"
import Typography from "@mui/material/Typography"
import Divider from "@mui/material/Divider"

// 任务执行的详情组件
const Tasks = () => {
  const [tasks, setTasks] = useState<{ ccmnn?: CcmnnSets, hdsay?: HdsaySets }>({})
  const {showSb} = useSharedSnackbar()

  useEffect(() => {
    document.title = `任务记录 - ${chrome.runtime.getManifest().name}`

    const init = async () => {
      let data = await chrome.storage.sync.get({tasks: {}})
      setTasks(data.tasks)
    }

    // 初始化
    init()
  }, [])

  return (
    <Stack direction={"row"} spacing={2} padding={2}>
      <Card sx={{width: 280}}>
        <CardHeader title={"Ccmnn"} avatar={<Avatar src={"https://club.ccmnn.com/favicon.ico"}/>}/>

        <Divider/>

        <CardContent>
          <Stack direction={"row"} spacing={1}>
            <Typography>最近回帖日期</Typography>
            <Typography>
              {tasks.ccmnn?.last || "从未"}{tasks.ccmnn?.last === new Date().toLocaleDateString() ? " (今日)" : ""}
            </Typography>
          </Stack>

          <Stack direction={"row"} spacing={1}>
            <Typography>当日已回帖数</Typography>
            <Typography>
              {tasks.ccmnn?.replyCount || 0}
            </Typography>
          </Stack>

          <Stack direction={"row"} spacing={1}>
            <Typography>历史总回帖数</Typography>
            <Typography>
              {tasks.ccmnn?.total || 0}
            </Typography>
          </Stack>
        </CardContent>

        <Divider/>

        <CardActions>
          <Button onClick={async () => {
            showSb({open: true, severity: "success", message: "已重启 Ccmnn 任务，请打开 Devtools，以保留后台"})
            chrome.alarms.clear(CCmnn.TAG_EN)
            // ccmnn
            await CCmnn.startTask()
            // 自动回复有奖励的帖子
            // 必须等上面的每日回帖任务完成后，才能开始回复奖励帖子的任务，以免因为网站回帖间隔限制（30秒）造成不必要的麻烦
            chrome.alarms.create(CCmnn.TAG_EN, {delayInMinutes: 1})
          }}>重启任务
          </Button>

          <Button href="https://club.ccmnn.com/" target="_blank">访问</Button>
        </CardActions>
      </Card>

      <Card sx={{width: 280}}>
        <CardHeader title={"Hdsay"} avatar={<Avatar src={"https://www.hdsay.net/favicon.ico"}/>}/>

        <Divider/>

        <CardContent>
          <Stack direction={"row"} spacing={1}>
            <Typography>最近回帖日期</Typography>
            <Typography>
              {tasks.hdsay?.last || "从未"}{tasks.hdsay?.last === new Date().toLocaleDateString() ? " (今日)" : ""}
            </Typography>
          </Stack>

          <Stack direction={"row"} spacing={1}>
            <Typography>当日已回帖数</Typography>
            <Typography>{tasks.hdsay?.replyCount || 0}</Typography>
          </Stack>

          <Stack direction={"row"} spacing={1}>
            <Typography>历史总回帖数</Typography>
            <Typography>{tasks.hdsay?.total || 0}</Typography>
          </Stack>
        </CardContent>

        <Divider/>

        <CardActions>
          <Button href="https://www.hdsay.net/" target="_blank">访问</Button>
        </CardActions>
      </Card>
    </Stack>
  )
}

export default Tasks