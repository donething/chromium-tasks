import React from "react"
import {useLocation} from 'react-router-dom'
import type {Reply, Supplement, Topic} from "./types"
import {date, request} from "do-utils"
import {useSharedSnackbar} from "do-comps"
import {Avatar, Box, IconButton, Stack} from "@mui/material"
import VerticalAlignTopOutlinedIcon from "@mui/icons-material/VerticalAlignTopOutlined"
import VerticalAlignBottomOutlinedIcon from "@mui/icons-material/VerticalAlignBottomOutlined"
import ArrowDownwardOutlinedIcon from "@mui/icons-material/ArrowDownwardOutlined"
import {useBetween} from "use-between"
import {get, Loading, padLR2, padTB1} from "./comm"

// 每次请求时返回的回复数量
const PAGE_SIZE = 20

// 共享数据
const shared = () => {
  // 当前读取完的回复页数
  const [page, setPage] = React.useState(1)
  // 通过老API获取回复列表时，需要禁用翻页，因为会返回该主题的所有回复
  const [disablePage, setDisablePage] = React.useState(false)

  return {page, setPage, disablePage, setDisablePage}
}
// 共享数据
const useShared = () => useBetween(shared)

// 工具栏
const Slider = React.memo(() => {
  // 共享
  const {setPage, disablePage} = useShared()

  return (
    <Stack position={"fixed"} bottom={20} right={200} gap={1}>
      <IconButton title={"页面顶部"} onClick={() => window.scrollTo({left: 0, top: 0, behavior: "smooth"})}>
        <VerticalAlignTopOutlinedIcon/>
      </IconButton>

      <IconButton title={"下一页评论"} disabled={disablePage} onClick={() => setPage(prev => ++prev)}>
        <ArrowDownwardOutlinedIcon/>
      </IconButton>

      <IconButton title={"页面底部"}
                  onClick={() => window.scrollTo({
                    left: 0,
                    top: document.documentElement.scrollHeight,
                    behavior: "smooth"
                  })}>
        <VerticalAlignBottomOutlinedIcon/>
      </IconButton>
    </Stack>
  )
})

/**
 * 附言项
 */
const SupplementItem = React.memo((ps: { supplement: Supplement, index: number }) => {
  return (
    <Stack {...padLR2} {...padTB1} borderBottom={"1px solid #e2e2e2"} bgcolor={"#fffff9"}>
      <Stack className={"extra"} direction={"row"} gap={2} marginBottom={1}>
        <span>{`第 ${ps.index} 条附言`}</span>
        <span>{date(new Date(ps.supplement.created))}</span>
      </Stack>

      <div className={"text"} dangerouslySetInnerHTML={{__html: ps.supplement.content_rendered}}/>
    </Stack>
  )
})

/**
 * 主题内容
 */
const Content = React.memo((ps: { tid: string, authorIDRef: React.MutableRefObject<number> }) => {
  // 主题内容
  const [topic, setTopic] = React.useState<Topic>()

  // 共享 Snackbar
  const {showSb} = useSharedSnackbar()

  const getData = async () => {
    setTopic(undefined)

    // 优先从源窗口获取主题的内容
    let topic: Topic | undefined = window.opener?.viewedTopic

    // 其次从网络获取主题的内容
    if (!topic) {
      topic = await get<Topic>(`https://www.v2ex.com/api/v2/topics/${ps.tid}`, undefined, showSb)
    }

    // 如果没有成功，就通过老API访问，不需设置请求头，所以直接用`request`
    if (!topic) {
      let resp = await request(`https://v2ex.com/api/topics/show.json?id=${ps.tid}&t=${Date.now()}`)
      let obj = await resp.json()
      topic = obj[0]
    }

    if (!topic) {
      console.log("获取到的主题信息为空")
      showSb({open: true, message: "获取到的主题信息为空", severity: "error"})
      return
    }

    ps.authorIDRef.current = topic.member.id
    setTopic(topic)
  }

  React.useEffect(() => {
    // 执行
    getData()
  }, [ps.tid])

  if (!topic) {
    return <Loading/>
  }

  if (!topic.content_rendered.startsWith("<p>")) {
    topic.content_rendered = `<p>${topic.content_rendered}</p>`
  }

  return (
    <Stack borderBottom={"1px solid #e2e2e2"}>
      {/* 标题、楼主名、头像 等 */}
      <Stack direction={"row"} padding={2} borderBottom={"1px solid #e2e2e2"}>
        <Stack>
          <span className={"title"}>{topic.title}</span>

          <Stack className={"extra"} direction={"row"} marginTop={2} marginRight={2} gap={2}>
            <a className={"author"} href={topic.member.url} target={"_blank"}>{topic.member.username}</a>
            <span>{date(new Date(topic.created * 1000))}</span>
            <span>{date(new Date(topic.last_touched * 1000))}</span>
            <a className={"author"} href={topic.node.url}>{topic.node.title}</a>
          </Stack>
        </Stack>

        <Avatar src={topic.member.avatar || topic.member.avatar_large} variant={"rounded"}
                sx={{marginLeft: "auto", marginRight: 1, alignSelf: "flex-start"}}/>
      </Stack>

      {/* 主题内容 */}
      <Box className={"text"} component={"div"} {...padLR2}
           dangerouslySetInnerHTML={{__html: topic.content_rendered}}/>

      {/* 附言 */}
      {
        topic.supplements && <Stack>
          {topic.supplements.map((item, index) => (
            <SupplementItem key={item.id} supplement={item} index={index}/>
          ))}
        </Stack>
      }
    </Stack>
  )
})

/**
 * 回复项
 */
const ReplyItem = React.memo((ps: { reply: Reply, index: number, authorID: number }) => {
  return (
    <Stack component={"li"} direction={"row"} alignItems={"center"} paddingTop={1} paddingBottom={1}
           borderTop={"1px solid #e2e2e2"} bgcolor={ps.index % PAGE_SIZE === 0 ? "#fffff9" : "inherit"}>
      <Avatar src={ps.reply.member.avatar || ps.reply.member.avatar_large} variant={"rounded"}
              sx={{marginTop: 1, marginLeft: 2, alignSelf: "flex-start"}}/>

      <Stack marginLeft={2} marginRight={2} gap={1}>
        <Stack className={"extra"} direction={"row"} alignItems={"center"} gap={2} fontSize={"14px"}>
          <a className={"author"} href={`https://v2ex.com/member/${ps.reply.member.username}`}
             target={"_blank"}>{ps.reply.member.username}{ps.reply.member.id === ps.authorID && " [楼主]"}</a>
          <span>{date(new Date(ps.reply.created * 1000))}</span>
        </Stack>

        <div className={"text"} dangerouslySetInnerHTML={{__html: ps.reply.content_rendered}}/>
      </Stack>

      <Box className={"extra"} component={"span"} marginLeft={"auto"} marginRight={2}>#{ps.index}</Box>
    </Stack>
  )
})

/**
 * 回复列表
 */
const Repies = React.memo((ps: { tid: string, authorIDRef: React.MutableRefObject<number> }) => {
  // 回复列表。设置为可空，为空时返回正在获取组件
  const [replies, setReplies] = React.useState<Reply[]>()

  // 共享页数
  const {page, setDisablePage} = useShared()

  // 共享 Snackbar
  const {showSb} = useSharedSnackbar()

  // 所有回复，用于展示
  const mReplies = React.useMemo(() => replies?.map((reply, index) =>
    <ReplyItem key={reply.id} reply={reply} index={index + 1} authorID={ps.authorIDRef.current}/>), [replies])

  // 获取回复列表
  const getData = async () => {
    // 获取该贴的回复列表
    let mReplies = await get<Reply[]>(`https://www.v2ex.com/api/v2/topics/${ps.tid}/replies?p=${page}`,
      undefined, showSb)

    // 如果没有成功，就通过老API访问，不需设置请求头，所以直接用`request`
    if (!mReplies) {
      let resp = await request(`https://v2ex.com/api/replies/show.json?topic_id=${ps.tid}&t=${Date.now()}`)
      let text = await resp.text()
      // 因为 @用户 的网址不带有协议和域名，所以手动搜索追加
      let nText = text.replaceAll("/member/", "https://v2ex.com/member/")
      mReplies = JSON.parse(nText)

      // 老API一次获取所有回复，不需要翻页
      setDisablePage(true)
    } else {
      // API2.0
      setDisablePage(false)

      // 由于读取的新数据可能有部分上次已经读取过，避免重复展示，需要删除
      // 可以在新数组中查找`replies`的最后一项，再删除重合部分
      if (mReplies.length >= 1 && replies && replies.length >= 1) {
        let index = mReplies.findIndex(item => item.id === replies[replies.length - 1].id)
        mReplies.splice(0, index + 1)
      }

      // 默认每页返回 PAGE_SIZE 个回复，不足就提示已获取完
      if (mReplies.length < PAGE_SIZE) {
        console.log("已读取所有回复")
        showSb({open: true, message: "已读取所有回复", severity: "info"})
      }
    }

    if (!mReplies) {
      console.log("获取到的回复列表为空")
      showSb({open: true, message: "获取到的回复列表为空", severity: "error"})
      return
    }

    setReplies(prev => [...prev || [], ...mReplies!!])

    setTimeout(() => page !== 1 && window.scrollBy({left: 0, top: 500, behavior: "smooth"}), 20)
  }

  React.useEffect(() => {
    console.log(`开始获取第 ${page} 页回复列表`)
    getData()
  }, [ps.tid, page])

  if (!replies) {
    return <Loading/>
  }

  return (
    <Stack component={"ul"}>{mReplies}</Stack>
  )
})

/**
 * 浏览V2ex的指定主题
 */
const ViewV2Topic = React.memo(() => {
  // 用于设置帖子的发布者，用于在回复列表中标识为“楼主”
  let authorIDRef = React.useRef(0)

  // 读取当前 URL的 query string 参数
  const location = useLocation()
  const params = new URLSearchParams(location.search)
  // 获取帖子的 ID：优先从参数中获取
  let tid = params.get("tid") || ""

  React.useEffect(() => {
    document.title = `V2ex 查看主题 - ${chrome.runtime.getManifest().name}`
  }, [])

  return (
    <Stack sx={{width: "50%", height: "100%", margin: "0 auto", background: "#FFF"}}>
      <Content tid={tid} authorIDRef={authorIDRef}/>
      <Repies tid={tid} authorIDRef={authorIDRef}/>

      <Slider/>
    </Stack>
  )
})

export default ViewV2Topic