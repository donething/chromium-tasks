import React from 'react'
import {createRoot} from 'react-dom/client'
import Popup from "./pages/Popup"
import Options from "./pages/Options"
import {HashRouter, Route, Routes} from "react-router-dom"
import {DoDialog, DoSnackbar} from "do-comps"
import Attentions from "./tasks/attention/attentions"
import Tasks from "./tasks/tasks"
import PicTasksComp from "./tasks/pics_dl/pic_tasks"
import {Zuji} from "./tasks/zuji/zuji"
import {ThemeProvider} from "@mui/material"
import DoTheme from "./comm/DoTheme"
import MatchesComp from "./pages/matches/matches"
import './index.css'
import DYSTabs from "./pages/dys/dys"
import V2exTopics from "./pages/v2ex/topics"
import ViewV2Topic from "./pages/v2ex/viewTopic"

const container = document.getElementById('root')
const root = createRoot(container!)

root.render(
  <React.StrictMode>
    <ThemeProvider theme={DoTheme}>
      <DoSnackbar/>
      <DoDialog/>

      <HashRouter>
        <Routes>
          <Route path="/" element={<span>首页</span>}/>
          <Route path="/options" element={<Options/>}/>
          <Route path="/popup" element={<Popup/>}/>
          <Route path="/attentions" element={<Attentions/>}/>
          <Route path="/matches" element={<MatchesComp/>}/>
          <Route path="/tasks" element={<Tasks/>}/>
          <Route path="/pic_tasks" element={<PicTasksComp/>}/>
          <Route path="/zuji" element={<Zuji/>}/>
          <Route path="/dys" element={<DYSTabs/>}/>
          <Route path="/v2ex" element={<V2exTopics/>}/>
          <Route path="/view_topic" element={<ViewV2Topic/>}/>
        </Routes>
      </HashRouter>
    </ThemeProvider>
  </React.StrictMode>
)

// Hot Module Replacement (HMR) - Remove this snippet to remove HMR.
// Learn more: https://snowpack.dev/concepts/hot-module-replacement
if (import.meta.hot) {
  import.meta.hot.accept()
}
