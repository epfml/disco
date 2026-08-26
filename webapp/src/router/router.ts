import createDebug from "debug";
import { createRouter, createWebHistory } from "vue-router";
import { scrollToTop } from "@/utils";

import TrainingBar from "@/components/progress_bars/TrainingBar.vue";
import TestingBar from "@/components/progress_bars/TestingBar.vue";
import HomePage from "@/components/pages/HomePage.vue";
import TaskCreationForm from "@/components/task_creation_form/TaskCreationForm.vue";
import TaskList from "@/components/pages/TaskList.vue";
import NotFound from "@/components/pages/NotFound.vue";
import Training from "@/components/training/TrainingSteps.vue";
import ModelLibrary from "@/components/testing/ModelLibrary.vue";
import AboutUs from "@/components/pages/AboutUs.vue";
import ChatUI from "@/components/testing/ChatUI.vue";

const debug = createDebug("webapp:router");

const router = createRouter({
  history: createWebHistory(),
  scrollBehavior(_to, _from, _savedPosition) {
    // Always scroll to top when navigating to a new page
    // Because router is wrapped in a BaseLayout, returning { top: 0 } doesn't do anything
    // https://github.com/vuejs/vue-router/issues/3451#issuecomment-975637797
    scrollToTop();
    return { top: 0 };
  },
  routes: [
    {
      path: "/",
      name: "HomePage",
      component: HomePage,
    },
    {
      path: "/create",
      name: "task-creation-form",
      component: TaskCreationForm,
    },
    {
      path: "/about",
      name: "about",
      component: AboutUs,
    },
    {
      path: "/list",
      name: "task-list",
      components: {
        default: TaskList,
        ProgressBar: TrainingBar,
      },
    },
    {
      path: "/evaluate",
      name: "evaluate",
      components: {
        default: ModelLibrary,
        ProgressBar: TestingBar,
      },
    },
    {
      path: "/:id",
      components: {
        default: Training,
        ProgressBar: TrainingBar,
      },
      props: {
        default: true,
        ProgressBar: false,
      },
    },
    {
      path: "/chat",
      name: "chat",
      components: {
        default: ChatUI,
      },
    },
    {
      path: "/not-found",
      name: "not-found",
      component: NotFound,
    },
    {
      path: "/:pathMatch(.*)*",
      component: NotFound,
    },
  ],
});

// Handle router errors
router.onError((err) => {
  // Handle the router error here
  debug("router error: %o", err);
  // Add code for reporting or other error handling logic
  void router.push({ path: "/not-found" });
});

export { router };
