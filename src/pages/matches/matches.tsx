import React, {useEffect, useRef, useState} from "react"
import IconHuya from "../../icons/huya.svg"
import IconDouyu from "../../icons/douyu.svg"
import IconBili from "../../icons/bili.svg"
import IconDYS from "../../icons/dys.svg"
import IconLCK from "../../icons/lck.svg"
import IconToCur from "../../icons/to_current.svg"
import {date, scrollIntoView, request, sleep} from "do-utils"
import {DoPanel, DoPanelHeader, DoPanelContent, DoTextTitle} from "do-comps/dist/main"
import Avatar from "@mui/material/Avatar"
import cheerio from "cheerio"
import {useSharedSnackbar} from "do-comps"
import Stack from "@mui/material/Stack"
import Box from "@mui/material/Box"
import IconButton from "@mui/material/IconButton"
import {alpha, SvgIcon, SxProps, Theme} from "@mui/material"
import Typography from "@mui/material/Typography"
import type {Game, Matches, ScheduleList} from "./types"
import Divider from "@mui/material/Divider"

// 需要获取赛程的比赛
const REG_EIDS = /(全球总决赛)|(MSI)|(LPL)|(LCK)|(NEST)/

// 样式
const sxOneLine: SxProps<Theme> = {
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap"
}
const sxTeamAavatar: SxProps<Theme> = {
  width: 24,
  height: 24
}
const sxTeamName: SxProps<Theme> = {
  ...sxOneLine,
  width: "40px",
  marginLeft: "5px"
}

// 根据比赛的输、赢、未知，返回图像
const ScoreIcon = (props: { score: number }) => {
  // 根据输、赢、未知，填充的颜色
  let bg = "#FFF"
  let borderColor = "#AAA"

  // -1：未知；0：输；1：赢
  if (props.score === 0) {
    bg = "#d0d0d0"
    borderColor = "#d0d0d0"
  } else if (props.score === 1) {
    bg = "#f2ae44"
    borderColor = "#f2ae44"
  }

  return (
    <Box bgcolor={bg} border={`1px solid ${borderColor}`} width={"6px"} height={"6px"} borderRadius={"50%"}/>
  )
}

// 单项比赛的布局
const GameItem = (props: { game: Game }) => {
  let game = props.game
  return (
    <Stack key={game.starttime} direction={"row"} alignItems={"center"} spacing={2} component={"li"}
           bgcolor={game.live ? alpha("rgb(82, 196, 26)", 0.2) : ""}
           padding={"8px 8px 8px 16px"}>
      {/* 比赛时间 */}
      <Typography>{game.starttime}</Typography>

      {/* 队名、对标 */}
      <Stack>
        {/* 主队 */}
        <Stack direction={"row"} alignItems={"center"}>
          <Avatar sx={sxTeamAavatar} src={game.oneicon}/>
          <Typography title={game.oneseedname}
                      sx={{
                        ...sxTeamName,
                        marginLeft: 1,
                        color: game.isover && game.onewin < game.twowin ? '#888' : 'inhert'
                      }}>
            {game.oneseedname}
          </Typography>
        </Stack>

        {/* 客队 */}
        <Stack direction={"row"} alignItems={"center"} marginTop={1}>
          <Avatar sx={sxTeamAavatar} src={game.twoicon}/>
          <Typography title={game.twoseedname}
                      sx={{
                        ...sxTeamName,
                        marginLeft: 1,
                        color: game.isover && game.onewin > game.twowin ? '#888' : 'inhert'
                      }}>
            {game.twoseedname}
          </Typography>
        </Stack>
      </Stack>

      {/* 比分 */}
      <Stack direction={"row"}>
        {
          game.onewin !== '0' || game.twowin !== '0' ? (
            <Stack alignItems={"center"}>
              {/* 主队 */}
              <Stack direction={"row"} alignItems={"center"}>
                <Typography width={1} mr={1}>{game.onewin}</Typography>
                <Stack direction={"row"} spacing={"3px"}>
                  {game.oneScore.map(n => <ScoreIcon score={n}/>)}
                </Stack>
              </Stack>

              {/* 客队 */}
              <Stack direction={"row"} alignItems={"center"} sx={{marginTop: 1}}>
                <Typography width={1} mr={1}>{game.twowin}</Typography>
                <Stack direction={"row"} spacing={"3px"}>
                  {game.twoScore.map((n) => <ScoreIcon score={n}/>)}
                </Stack>
              </Stack>
            </Stack>
          ) : (
            // 比赛还未开始时，显示局数
            <Typography noWrap={true} fontSize={"medium"}>BO {game.bonum}</Typography>
          )
        }
      </Stack>

      {/* 比赛名 */}
      <Typography title={game.ename} sx={{...sxOneLine, color: "#888"}} pl={2}>
        {game.ename}
      </Typography>
    </Stack>
  )
}

// 当日的比赛整体为一个列表项，里面的比赛场次又构成一个列表
const DayItem = (props: { date: string, dateBlock: string, matches: Game[], isMarked: boolean }) => {
  // 该日的比赛
  const games = props.matches.map(game => <GameItem game={game}/>)

  // 一日内的所有比赛列表
  return (
    <Stack component={"li"} mb={3} width={"100%"}
           id={props.isMarked ? "matches-recent" : ""}
           bgcolor={props.isMarked ? alpha("rgb(82, 196, 26)", 0.1) : "inherit"}>
      {/* 日期 */}
      <Typography color={"#555"} fontWeight={"600"} paddingLeft={2}>
        {props.dateBlock}
      </Typography>

      {/* 该日所有赛程 */}
      <Stack component={"ul"} divider={<Divider/>}>
        {games}
      </Stack>
      <Divider component={"li"}/>
    </Stack>
  )
}

// 比赛列表组件
// 当最近一周没有赛程时，继续请求以前日期的赛程
const MatchesComp = (): JSX.Element => {
  // 指定时间(如"1629648000"），将获取所在周的赛程
  const [time, setTime] = useState(Math.floor(Date.now() / 1000))
  // 赛程信息，更新界面
  const [matches, setMatches] = useState<Array<ScheduleList>>([])

  // 显示消息
  const {showSb} = useSharedSnackbar()

  let loadBusyRef = useRef(false)
  // 最近的下一场比赛的日期，将标识
  let recentNextRef = useRef("")
  // 上一周赛程的开始日期（如 1628956800）
  let prevRef = useRef(0)
  // 下一周赛程的开始日期（如 1629648000）
  let nextRef = useRef(0)

  // 设置当日的日期（如"20210125"）
  let today = date(new Date(), "YYYYmmdd")

  // 因为 scroll 事件会频繁触发，所以设置 setTimeout 避免多次获取赛程
  // 另外只使用 loadBusy 状态量时，如果网速过快--，起不了避免多次赛程的作用，所以另加 setTimeout 使用
  let setLoadDone = () => {
    setTimeout(() => {
      loadBusyRef.current = false
    }, 500)
  }

  // 临时此次获取的赛程，将合并到 matches
  let matchesTmp: Array<ScheduleList> = []
  const init = async () => {
    // 先获取赛区列表
    let listResp = await request("https://wanplus.cn/lol/schedule")
    let listHtmlStr = await listResp.text()
    let $ = cheerio.load(listHtmlStr)

    // 需要获取赛程的赛区列表
    let eids: Array<string> = []
    let eidsName: Array<string> = []
    $("ul.slide-list li").toArray().forEach(item => {
      let doc = $(item)
      // 仅提取英雄联盟(编号为"2")的赛程
      if (doc.attr("data-gametype") === "2" && REG_EIDS.test(doc.text())) {
        eids.push(doc.attr("data-eid")?.trim() || "未知游戏")
        eidsName.push(doc.text().trim())
      }
    })

    // 再请求指定赛区的赛程
    let url = "https://www.wanplus.cn/ajax/schedule/list"
    let data = `game=2&eids=${eids.join(",")}&time=${time}`
    let headers = {
      "x-requested-with": "XMLHttpRequest"
    }

    console.log(`获取LOL赛程(${time})`, `包含的赛区：${JSON.stringify(eidsName)}`)
    request(url, data, {headers: headers}).then(async resp => {
      let payload: Matches = await resp.json()

      // 提取赛程
      // 按日提取赛程信息
      for (const [date, matches] of Object.entries(payload.data.scheduleList)) {
        // list 为 false，表示当日没有比赛
        if (!matches.list) continue
        // 找到最近的下一场比赛的日期（如"20210125"）
        // 如果recentNext不为空，说明已找到离今天最近的赛程，不需要再改变了
        if (recentNextRef.current === "" && date >= today) {
          recentNextRef.current = date
        }

        // 添加当日的比赛到列表
        matches.dateKey = date
        matchesTmp.push(matches)
      }

      // 根据获取更早、更晚赛事的情况，需要分先后连接数组
      if (time === nextRef.current) {
        setMatches(prev => [...prev, ...matchesTmp])
      } else if (time === prevRef.current) {
        setMatches(prev => [...matchesTmp, ...prev])
      } else {
        setMatches([...matchesTmp])
        // 首次获取赛程时，自动滚动到当天的赛程（因为渲染问题，需要延迟一会儿）
        await sleep(100)
        scrollIntoView("#matches-recent")
      }

      setLoadDone()
      // 最近一周没有赛程时，继续请求以前日期的赛程
      if (matchesTmp.length === 0) {
        if (matches.length === 0) {
          setTime(payload.data.prevtime)
          return
        } else {
          showSb({open: true, severity: "info", message: "没有更多的赛程信息了", autoHideDuration: 1000})
          return
        }
      }
      // 保存更前、后赛程的时间信息
      if (nextRef.current === 0 || payload.data.nexttime > nextRef.current) {
        nextRef.current = payload.data.nexttime
      }
      if (prevRef.current === 0 || payload.data.prevtime < prevRef.current) {
        prevRef.current = payload.data.prevtime
      }
    }, error => {
      console.log(`获取 LOL 赛程时出现网络错误`, error)
      setLoadDone()
    })
  }

  // 加载更多的事件
  const onWheel = (event: Event) => {
    let elem = document.querySelector(".VPanel-content") as HTMLElement
    if (!elem || loadBusyRef.current) {
      return
    }
    let me = event as WheelEvent
    if (me.deltaY > 0 && elem.scrollTop >= elem.scrollHeight - elem.offsetHeight - 200) {
      setTime(nextRef.current)
    }

    if (me.deltaY < 0 && elem.scrollTop <= 200) {
      setTime(prevRef.current)
    }
  }

  useEffect(() => {
    document.title = `赛程 - ${chrome.runtime.getManifest().name}`

    loadBusyRef.current = true

    // 请求数据、更新界面
    init()
  }, [time])

  useEffect(() => {
    // 使用滚轮事件加载更多
    let content = document.querySelector(".VPanel-content")
    content?.addEventListener("mousewheel", onWheel)
    return () => content?.removeEventListener("mousewheel", onWheel)
  }, [])

  // 工具栏
  let tools = (
    <Stack direction={"row"} alignItems={"center"}>
      <IconButton title="LPL 虎牙" href={"https://www.huya.com/lpl"} target={"_blank"}>
        <SvgIcon component={IconHuya} viewBox={"0 0 1024 1024"}/>
      </IconButton>

      <IconButton title="LPL 斗鱼" href={"https://www.douyu.com/lpl"} target={"_blank"}>
        <SvgIcon component={IconDouyu} viewBox={"0 0 1024 1024"}/>
      </IconButton>

      <IconButton title="LPL 哔哩哔哩" href={"https://live.bilibili.com/6"} target={"_blank"}>
        <SvgIcon component={IconBili} viewBox={"0 0 1024 1024"}/>
      </IconButton>

      <IconButton title="LPL 德云色" href={"https://live.bilibili.com/7777"} target={"_blank"}>
        <SvgIcon component={IconDYS} viewBox={"0 0 800 800"}/>
      </IconButton>

      <IconButton title="LCK" href={"https://www.huya.com/lck"} target={"_blank"}>
        <SvgIcon component={IconLCK} viewBox={"0 0 775 550"}/>
      </IconButton>

      <IconButton title="跳转到最近的赛程" onClick={_ => scrollIntoView('#matches-recent')}>
        <SvgIcon component={IconToCur} viewBox={"0 0 1024 1024"}/>
      </IconButton>
    </Stack>
  )

  // 渲染赛程
  let matchesList = matches.map(schedule =>
    <DayItem key={schedule.date}
             date={schedule.dateKey}
             dateBlock={schedule.lDate}
             matches={schedule.list}
             isMarked={schedule.dateKey === recentNextRef.current}
    />
  )

  return (
    <DoPanel width={"400px"} divider={<Divider/>}>
      <DoPanelHeader>
        <DoTextTitle>LOL 赛程</DoTextTitle>
        {tools}
      </DoPanelHeader>

      <DoPanelContent className={"VPanel-content"} component={"ul"}>
        {matchesList}
      </DoPanelContent>
    </DoPanel>
  )
}

export default MatchesComp