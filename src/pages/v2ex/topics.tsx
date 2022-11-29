import {Avatar, Box, Button, IconButton, Stack, SxProps, Tab, Tabs, Typography} from "@mui/material"
import React from "react"
import {date, request, trunStrBegin} from "do-utils"
import type {Topic, TopicBasic} from "./types"
import {useSharedDialog, useSharedSnackbar} from "do-comps"
import ReplayOutlinedIcon from '@mui/icons-material/ReplayOutlined'
import ArrowUpwardOutlinedIcon from "@mui/icons-material/ArrowUpwardOutlined"
import ArrowDownwardOutlinedIcon from "@mui/icons-material/ArrowDownwardOutlined"
import TuneOutlinedIcon from "@mui/icons-material/TuneOutlined"
import {get, Loading} from "./comm"
import V2exSettings, {CS_KEY_V2EX_TOPICS, V2exNodeItem, V2exSets} from "./settings"

// Tab 项的样式
// 长文本显示省略号无效，只好用 trunStr() 截断
const sxTab: SxProps = {
  maxWidth: "90px",
  minWidth: "auto",
  whiteSpace: "nowrap",
  textOverflow: "ellipsis",
  overflow: "hidden",
  textAlign: "left",
  alignItems: "flex-start"
}

// 主题项
const TopicItem = React.memo((ps: Topic) => {
  return (
    <Stack component={"li"} direction={"row"} alignItems={"center"} paddingTop={2} paddingBottom={2}
           borderTop={"1px solid #e2e2e2"}>
      <Avatar src={ps.member.avatar || ps.member.avatar_large} variant={"rounded"}
              sx={{marginTop: 1, marginLeft: 1, alignSelf: "flex-start"}}/>

      <Stack marginLeft={2}>
        {/* 链接中加入回复数量，可以在点击浏览后有新回复时，颜色恢复为未点击的状态 */}
        <a className={"title link line-1"} href={`/index.html#/view_topic?tid=${ps.id}&c=${ps.replies}`}
           onClick={e => {
             // 只适配了左键的单击事件，中键单击还是打开Link的href
             // 如果都适配需要用 onMouseDown 而不能用 onMouseUp（此时会同时触发点击Link的事件）
             e.preventDefault()
             // 模拟设置已访问该链接，以符合、使用css属性
             // 由于`replaceState`会替换地址栏的URL，需要先保存当前URL，设置访问指定URL后，再替换回来
             let culUrl = window.location.href
             history.replaceState({}, "", (e.target as HTMLLinkElement).href)
             history.replaceState({}, "", culUrl)

             // 传递数据，并打开新窗口
             window.viewedTopic = ps
             window.open(`/index.html#/view_topic?tid=${ps.id}`)
           }}>{ps.title}
        </a>

        <Typography className={"desp line-2"} marginTop={1}>{ps.content}</Typography>

        <Stack className={"extra"} direction={"row"} alignItems={"center"} marginTop={1} gap={2} fontSize={"14px"}>
          <a className={"author"} href={`https://v2ex.com/member/${ps.member.username}`}
             target={"_blank"}>{ps.member.username}</a>
          <span>{date(new Date(ps.created * 1000))}</span>
          <span>{date(new Date(ps.last_touched * 1000))}</span>
        </Stack>
      </Stack>

      <Button href={ps.url} sx={{marginLeft: "auto", color: "#ccc", minWidth: "32px"}}>
        {ps.replies}
      </Button>
    </Stack>
  )
})

// 工具栏
const Slider = React.memo((ps: {
  tabCurrent: string,
  pageMap: { [p: string]: number },
  setPageMap: React.Dispatch<React.SetStateAction<{ [p: string]: number }>>
}) => {
  // 用于显示设置
  const {showDialog} = useSharedDialog()

  const setPage = React.useCallback((step: number) => ps.setPageMap(prev => {
    // 初始没有 page 属性，设为 1
    let page = prev[ps.tabCurrent] || 1
    // 页数不能小于 1
    page = page + step
    if (page < 1) {
      page = 1
    }

    return {...prev, [ps.tabCurrent]: page}
  }), [ps.tabCurrent])

  return (
    <Stack position={"fixed"} bottom={20} right={200} gap={1}>
      <IconButton title={"第一页"} onClick={() => setPage(-100000)}><ReplayOutlinedIcon/></IconButton>
      <IconButton title={"上一页"} disabled={!ps.pageMap[ps.tabCurrent] || ps.pageMap[ps.tabCurrent] === 1}
                  onClick={() => setPage(-1)}><ArrowUpwardOutlinedIcon/></IconButton>

      <Typography title={"当前页数"} fontSize={"1.2em"} fontWeight={600} textAlign={"center"}>
        {ps.pageMap[ps.tabCurrent] || 1}
      </Typography>

      <IconButton title={"下一页"} onClick={() => setPage(1)}><ArrowDownwardOutlinedIcon/></IconButton>

      <IconButton title={"设置"} onClick={() => showDialog({
        open: true,
        title: "设置",
        content: <V2exSettings showDialog={showDialog}/>
      })}><TuneOutlinedIcon/></IconButton>
    </Stack>
  )
})

/**
 * V2ex 主题列表
 */
const V2exTopics = React.memo(() => {
  // 标签信息，键值为：标签名、标签标题。如 {qna: "问与答"}
  const [tabList, setTabList] = React.useState<V2exNodeItem[]>([])
  // 当前被选择的 Tab 的键。如 "qna"
  const [tabCurrent, setTabCurrent] = React.useState("")

  // 存储所有标签的主题的列表，用于显示
  // map 键为标签名（如"qna"），值为该标签的主题的列表
  const [topicsMap, setTopicsMap] = React.useState<{ [key: string]: Topic[] }>({})

  // 存储所有标签的当前页数，用于获取数据
  // map 键为标签名（如"qna"），值为该标签的当前页数
  const [pageMap, setPageMap] = React.useState<{ [key: string]: number }>({})

  // 共享 Snackbar
  const {showSb} = useSharedSnackbar()

  // 切换标签
  const handleChange = React.useCallback((event: React.SyntheticEvent, newValue: string) => {
    setTabCurrent(newValue)
  }, [])

  // 所有标签
  const tabs = React.useMemo(() => tabList.map(tab =>
      <Tab label={trunStrBegin(tab.title, 4)} value={tab.name} title={tab.title} sx={{...sxTab}}/>),
    [tabList])

  // 所有主题
  const allTopics = React.useMemo(() => topicsMap[tabCurrent]?.map(t => <TopicItem
    key={t.id} {...t} />), [topicsMap[tabCurrent]])

  // 初始化
  const init = async () => {
    let storage = await chrome.storage.sync.get({[CS_KEY_V2EX_TOPICS]: {}})
    let sets: V2exSets = storage[CS_KEY_V2EX_TOPICS]
    if (sets.nodes) {
      setTabList(sets.nodes)
    } else {
      console.log("请先在设置中添加节点")
      showSb({open: true, message: "请先在设置中添加节点", severity: "info"})
    }
  }

  // 获取当前标签的主题列表
  const getData = async () => {
    // 还未完成初始化，不需要获取
    if (!tabCurrent) return

    // 获取主题列表
    let page = pageMap[tabCurrent] || 1
    let topics = await get<TopicBasic[]>(`https://www.v2ex.com/api/v2/nodes/${tabCurrent}/topics?p=${page}`,
      undefined, showSb)

    if (!topics) {
      showSb({open: true, message: "无法读取主题列表，可查看控制台", severity: "warning"})
      return
    }

    // 用于判断此次获取是否API2.0可用
    let available = true

    // 获取某个主题的楼主信息
    for (const t of topics) {
      // 获取主题的详情
      // 通过API2.0的token访问时，会与该账号的访问权限一致
      // 当账号无权访问某些节点和其下主题时，就用老API访问
      let topic: Topic | undefined

      if (available) {
        topic = await get<Topic>(`https://www.v2ex.com/api/v2/topics/${t.id}`, undefined, showSb)
      }

      // 如果没有成功，就通过老API访问，不需设置请求头，所以直接用`request`
      if (!topic) {
        let resp = await request(`https://v2ex.com/api/topics/show.json?id=${t.id}`)
        let obj = await resp.json()
        topic = obj[0]

        // API2.0还不可用，标识
        available = false
      }

      if (!topic) {
        console.log("获取到的主题信息为空")
        showSb({open: true, message: "获取到的主题信息为空", severity: "error"})
        continue
      }

      setTopicsMap(prev => {
        // 将主题加入到当前标签的列表中
        let tabTopics = [...(prev[tabCurrent] || []), topic!!]
        return {...prev, [tabCurrent]: tabTopics}
      })
    }
  }

  // 从 chromium storage 中读取数据，完成初始化
  React.useEffect(() => {
    document.title = `V2ex 主题列表 - ${chrome.runtime.getManifest().name}`

    // 初始化后选择默认标签，以加载数据
    init()
  }, [])

  // 初始化后，设置默认标签，显示数据
  React.useEffect(() => {
    tabList.length !== 0 && setTabCurrent(tabList[0].name)
  }, [tabList])

  // 负责获取首次的数据
  React.useEffect(() => {
    // 初始渲染时 tabCurrent 为""，需要判断以跳过
    // 当标签改变，仅当该标签的数据为空（说明为首次）时，才需要获取数据
    if (tabCurrent && (!topicsMap[tabCurrent] || topicsMap[tabCurrent].length === 0)) {
      console.log(`初始化Tab ${tabCurrent}`, "开始获取主题列表")
      getData()
    }
  }, [tabCurrent])

  // 负责获取页数变化后的数据
  React.useEffect(() => {
    // 不负责获取首次的数据
    if (!topicsMap[tabCurrent]) {
      return
    }

    // 翻页时，清除当前标签的主题列表数据
    console.log(`Tab ${tabCurrent} 翻页，获取第 ${pageMap[tabCurrent]} 页的主题列表`)
    setTopicsMap(prev => ({...prev, [tabCurrent]: []}))
    getData()
  }, [pageMap]) // deps 不要写成 pageMap[tabCurrent]，否则切换标签也会触发 getData()

  return (
    <Stack sx={{width: "50%", height: "100vh", margin: "0 auto", bgcolor: "#FFF"}}>
      {/* Tab 标签 */}
      <Box width={"100%"} flex={"0 1 auto"} borderColor={"divider"}>
        <Tabs value={tabCurrent} onChange={handleChange} variant="scrollable">{tabs}</Tabs>
      </Box>

      {/* 主题列表 */}
      {!allTopics ? <Loading/> :
        <Stack component={"ul"} overflow={"auto"} marginTop={1}>{allTopics}</Stack>}

      {/* 工具按钮 */}
      <Slider tabCurrent={tabCurrent} pageMap={pageMap} setPageMap={setPageMap}/>
    </Stack>
  )
})

export default V2exTopics