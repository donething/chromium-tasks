import React, {useEffect, useState} from "react"
import {Box, Pagination, Stack, Tab, Tabs} from "@mui/material"
import {request, sleep} from "do-utils/dist/utils"
import {useSharedSnackbar} from "do-comps"
import {date} from "do-utils/dist/text"

namespace DYS {
  // 请求某个合集的响应
  export interface SeriesResp {
    // 0 表示正常
    code: number
    message: string
    ttl: number
    data: Data
  }

  export interface Data {
    // 合集内视频的 aid 列表
    aids: number[]
    // 当前请求的页数信息
    page: Page
    // 合集内视频集的列表
    archives: Arc[]
  }

  // 当前请求的页数信息
  export interface Page {
    // 当前页数，如 1
    num: number
    // 每页视频数量，默认 30
    size: number
    // 当前合集包含的视频数量
    total: number
  }

  // 合集内视频集的信息
  export interface Arc {
    // 视频集的 aid
    aid: number
    // 视频集的 bvid
    bvid: string
    // 合集集的标题
    title: string
    // 发布日期的时间戳（秒），如 1663043650
    pubdate: number
    ctime: number
    state: number
    // 视频集的封面地址
    pic: string
    // 视频集内所有视频的时长和
    duration: number
    stat: Stat
    ugc_pay: number
    interactive_video: boolean
  }

  // 视频集的浏览信息
  export interface Stat {
    // 已观看次数
    view: number
  }
}

// 需要保存到存储的数据
type DysInfo = {
  // 页面关闭前处在的 Tab 的 ID
  ctid: number
  // 每个 Tab 已浏览的页数
  pages: Array<number>
}

// 需要获取的合集的信息，一个元素用一个 Tab 展示
const SeriesInfos = [
  {
    // 对应当前 Tab 的索引，用于恢复网页时，恢复展示之前的 Tab
    tid: 0,
    title: "直播回放",
    mid: "8739477",
    series_id: "405144",
    size: 100,
  },
  {
    tid: 1,
    title: "解说比赛",
    mid: "8739477",
    series_id: "449435",
    size: 30
  }
]

// 根据人、时间过滤视频
const filterSL = (title: string): boolean => {
  // 不是 19 点场，直接返回
  if (title.indexOf("19点场") < 0) {
    return false
  }

  // 根据时间过滤
  let r = title.match(/(2\d+)年(\d+)月(\d+)日/)
  if (!r || r.length < 4) {
    return false
  }
  let date = new Date(r.slice(1).join("/"))
  let day = date.getDay()

  // 只返回 周二(2)、四(4)、六(6)、日(0)的视频
  return day === 0 || day === 2 || day === 4 || day === 6
}

// 创建所有数据的初始数组
const initDataList = (n: number): [][] => {
  let a = new Array(n)
  for (let i = 0; i < a.length; i++) {
    a[i] = []
  }
  return a
}

// 返回当前 Tab 的信息，用于恢复展示 Tab 关闭前的数据
const getDysInfo = async (): Promise<DysInfo> => {
  let data = await chrome.storage.sync.get({dys: {}})
  return data.dys
}

// 保存 Tab 信息到地址栏，以便恢复
const setTabInfo = async (ctid: number, pages: Array<number>) => {
  let data: DysInfo = {ctid: ctid, pages: pages}
  await chrome.storage.sync.set({dys: data})
  console.log("已保存已浏览信息的数据")
}

// 获取DYS指定视频合集的组件
const DYSTabs = (): JSX.Element => {
  // 当前被选择的 Tab 的索引，为 -1 表示初始不需要联网获取数据，以免多次获取
  const [tabCurrent, setTabCurrent] = useState(0)

  // 每个标签内已获取视频的页数
  // 恢复 Tab 关闭前的页数信息
  const [pagesList, setPagesList] = useState<Array<number>>(new Array(SeriesInfos.length).fill(1))
  // 每个标签内视频的总页数
  const [pTotalList, setPTotalList] = useState<Array<number>>(new Array(SeriesInfos.length).fill(1))

  // 存储所有 Tab 内的视频合集的数据，每个元素表示一个标签
  // fill() 当参数为引用类型时，所有数组元素会共用这个引用，导致更改一个值时，其它元素的值也改变，所以需要避免
  const [dataList, setDataList] = useState<Array<Array<DYS.Arc>>>(initDataList(SeriesInfos.length))

  // 显示消息
  const {showSb} = useSharedSnackbar()

  // 切换标签即切换索引，索引从 0 开始
  const handleChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabCurrent(newValue)
    setTabInfo(newValue, pagesList)
  }

  // 获取数据
  const getData = async (ctid: number) => {
    let mid = SeriesInfos[ctid].mid
    let series_id = SeriesInfos[ctid].series_id
    let page = pagesList[ctid]
    let size = SeriesInfos[ctid].size
    let url = `https://api.bilibili.com/x/series/archives?mid=${mid}` +
      `&series_id=${series_id}&only_normal=true&sort=desc&pn=${page}&ps=${size}`
    let resp = await request(url)
    let obj: DYS.SeriesResp = await resp.json()
    if (obj.code !== 0) {
      showSb({open: true, severity: "error", message: `获取用户UID"${mid}"的视频集出错：${obj.message}`})
      console.log(`获取用户UID"${mid}"的视频集出错：${obj.message}`, url)
      return
    }

    // 设置该视频集的总页数
    setPTotalList(prev => {
      let nArray = [...prev]
      nArray[tabCurrent] = Math.ceil(obj.data.page.total / obj.data.page.size)
      return nArray
    })

    // 填充需展示的数据
    setDataList(prev => {
      let nArray = [...prev]
      let add = obj.data.archives
      // 只对直播视频过滤，对解说视频不需过滤
      if (series_id === "405144") {
        add = add.filter(v => filterSL(v.title))
      }

      // 设置该标签内的数据（因为翻页，而不用追加）
      nArray[tabCurrent] = add

      setTabInfo(tabCurrent, pagesList)

      return nArray
    })
  }

  // 初始化
  const init = async () => {
    let dysInfo = await getDysInfo()
    if (dysInfo.pages && dysInfo.pages.length > 0) {
      // 以下两句，为了当新添加了 SeriesInfos 项目时，将存储的数据恢复到前面，后面则为新项目的数据
      let tmp = [...pagesList]
      tmp.splice(0, dysInfo.pages.length)
      // 恢复数据
      setPagesList([...dysInfo.pages, ...tmp])
      showSb({open: true, message: "将跳转到上次浏览的位置", severity: "success"})
    }

    // 等待加载保存的数据完毕后，才触发 useEffect，避免 useEffect 优先时，将初始数据覆盖了已保存的数据
    await sleep(500)
    setTabCurrent(dysInfo.ctid || 0)
  }

  useEffect(() => {
    document.title = "B站视频集"

    init()
  }, [])

  // 当 Tab 改变时，仅当该 Tab 内数据为空时，才获取
  useEffect(() => {
    if (dataList[tabCurrent].length === 0) {
      getData(tabCurrent)
    }
  }, [tabCurrent])

  // 翻页
  useEffect(() => {
    // 首次获取，由标签变化时的 useEffect() 获取，避免重复获取首次数据
    if (dataList[tabCurrent].length === 0) {
      return
    }

    getData(tabCurrent).catch(() => {
      // 获取出错后，回退页数
      setPagesList(prev => {
        let n = [...prev]
        n[tabCurrent] = n[tabCurrent] - 1
        return n
      })
    })
  }, [pagesList])

  return (
    <Stack direction={"column"} bgcolor={"background.paper"}
           sx={{height: "100vh", margin: "0 160px", display: "flex", flexFlow: "column"}}>
      {/* Tab 标签 */}
      <Box sx={{width: '100%', flex: "0 1 auto"}}>
        <Tabs value={tabCurrent} onChange={handleChange} centered={true}>
          {
            SeriesInfos.map(item => <Tab label={item.title}/>)
          }
        </Tabs>
      </Box>

      {/* 视频列表 */}
      <Box className="row-list" sx={{flex: "1 1 auto", marginTop: 1, overflow: "auto"}}>
        {
          dataList[tabCurrent].map(item =>
            <Stack className="row-item" direction={"column"} width={"160px"} padding={"10px"} margin={"3px"}>
              <a href={`https://www.bilibili.com/video/${item.bvid}`} target={"_blank"}>
                <img src={item.pic} style={{width: "160px", height: "100px", borderRadius: "4px"}} alt={"封面"}/>
              </a>

              <a title={item.title} href={`https://www.bilibili.com/video/${item.bvid}`} target={"_blank"} style={{
                fontSize: "14px", marginTop: "3px", lineHeight: "20px", height: "40px",
                display: "block", overflow: "hidden"
              }}>{item.title}</a>

              <Stack direction={"row"} justifyContent={"space-between"} color={"#999"} marginTop={"3px"}>
                <span>{item.stat.view} 人</span>
                <span>{date(new Date(item.pubdate * 1000), "YYYY-mm-dd")}</span>
              </Stack>
            </Stack>
          )
        }
      </Box>

      {/* 分页 */}
      <Box sx={{flex: "0 1 auto", marginTop: 2, marginBottom: 2, display: "flex", justifyContent: "center"}}>
        <Pagination page={pagesList[tabCurrent]} count={pTotalList[tabCurrent]} size={"large"}
                    onChange={(event: object, p: number) => setPagesList(prev => {
                      // 更新页数
                      let n = [...prev]
                      n[tabCurrent] = p
                      return n
                    })}
        />
      </Box>
    </Stack>
  )
}

export default DYSTabs