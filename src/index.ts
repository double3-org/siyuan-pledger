import "./utils/safe-custom-elements-patch ";
import "cally";
import {
  Plugin,
  Menu,
  Dialog,
  getFrontend,
  openTab,
  showMessage,
  openMobileFileById,
} from "siyuan";
import { createApp, ref } from "vue";

import { alert } from "./utils/dialog-utils";

import SettingView from "./view/Setting.vue";
import MainView from "./view/pc/PCMain.vue";
import MobileView from "./view/mobile/MobileMain.vue";
import { defaultIconSymbols } from "./config/defaultIcons";
import "./index.css";

const settingConfFile = "setting.json"; // 插件的数据，会被保存在 data/storage/petal/<name>/​ 下
const defaultSettingConfData: SettingConfig = {
  documentId: "",
  config: "",
  planNum: "",
  bookkeepingDocumentId: "",
  bookkeepingStorageMode: "",
  bookkeepingConfig: "",
  iconConfig: "[]",
};
const settingConfData = ref<SettingConfig>({ ...defaultSettingConfData });

export default class PersonalLedgerPlug extends Plugin {
  private isMobile = getFrontend().endsWith("mobile");

  // 初始化顶栏的菜单
  initTopBarMenu = (rect: any) => {
    const menu = new Menu("pledgerTopbarMenu");

    menu.addItem({
      icon: "iconD3PlIcon",
      label: "打开账本",
      click: () => {
        if (settingConfData.value.documentId) {
          this.openTab();
        } else {
          showMessage("pLedger<br>请先在设置中配置数据存放位置", 3000, "error");
          this.openSetting();
        }
      },
    });

    menu.addItem({
      icon: "iconSettings",
      label: "设置",
      click: () => {
        this.openSetting();
      },
    });

    if (this.isMobile) {
      menu.fullscreen();
    } else {
      var rectDom =
        document.querySelector("#barPlugins") ||
        document.querySelector("#barMore");
      if (rect.width === 0 && rectDom) {
        rect = rectDom.getBoundingClientRect();
      }
      menu.open({
        x: rect.right,
        y: rect.bottom,
        isLeft: true,
      });
    }
  };

  // 加载设置面板
  openSetting(): void {
    let dialog = new Dialog({
      title: "pLedger 插件设置",
      content: `<div id="SettingPanel" style="height: 100%;"></div>`,
      width: "960px",
      destroyCallback: () => {
        settingView.unmount();
      },
    });

    const self = this;

    function closeSetting() {
      dialog.destroy();
    }

    function saveSetting(settingData: SettingConfig) {
      if (checkSettingConf(settingData)) {
        const nextSettingData = normalizeSettingConf(settingData);
        self.saveData(settingConfFile, nextSettingData);
        settingConfData.value = nextSettingData;
        registerSettingIcons(self, nextSettingData);
        showMessage("设置已保存", 2000, "info");
        closeSetting();
      }
    }

    const settingView = createApp(SettingView, {
      closeSetting,
      saveSetting,
      settingConfData: settingConfData.value,
    });

    settingView.mount("#SettingPanel");
  }

  // 打开 tab
  openTab(): void {
    if (this.isMobile) {
      // 移动端弹窗打开
      const mainView = alert(MobileView, {
        title: "pLedger",
        props: {
          settingConfData: settingConfData.value,
        },
      });
    } else {
      const id = "pLedgerPluginTab";
      this.addTab({
        type: id,
        init() {
          const mainView = createApp(MainView, {
            settingConfData: settingConfData.value,
          });
          mainView.mount(this.element);
        },
      });
      // 桌面端新标签页打开
      openTab({
        app: this.app,
        custom: {
          title: "pLedger",
          icon: "iconD3PlIcon",
          id: this.name + id,
        },
      });
    }
  }

  // 初始化插件
  async onload() {
    const frontEnd = getFrontend();
    this.isMobile = frontEnd === "mobile" || frontEnd === "browser-mobile";

    // 读取插件设置
    settingConfData.value = normalizeSettingConf(await this.loadData(settingConfFile));
    registerSettingIcons(this, settingConfData.value);

    // 注册顶栏
    const topBarElement = this.addTopBar({
      icon: "iconD3PlIcon", // 图标
      title: "pledger 账本", // 鼠标悬停时显示的标题
      position: "right",
      callback: () => {
        let rect = topBarElement.getBoundingClientRect();
        this.initTopBarMenu(rect);
      },
    });
  }

  async onLayoutReady() {
    //布局加载完成的时候，会自动调用这个函数
  }

  async onunload() {

  }

  async uninstall() {
    // 卸载插件时删除插件数据
    this.removeData(settingConfFile);
  }
}

function checkSettingConf(data: any): boolean {
  if (!data) {
    return false;
  }

  return true;
}

function normalizeSettingConf(data: Partial<SettingConfig> | undefined): SettingConfig {
  return {
    ...defaultSettingConfData,
    ...(data || {}),
    iconConfig: data?.iconConfig || "[]",
  };
}

function getIconSymbols(iconConfig: string): string[] {
  try {
    const iconList = JSON.parse(iconConfig || "[]");
    if (!Array.isArray(iconList)) return [];

    return iconList
      .map((item: IconConfigItem) => item?.symbol)
      .filter((symbol: string) => typeof symbol === "string" && symbol.includes("<symbol"));
  } catch (error) {
    console.error("图标配置解析失败，仅使用内置默认图标", error);
    return [];
  }
}

function registerSettingIcons(plugin: Plugin, settingData: SettingConfig) {
  // 内置图标不进入设置页，但始终注册，避免旧资产配置引用失效。
  [...defaultIconSymbols, ...getIconSymbols(settingData.iconConfig)].forEach((icon) => {
    plugin.addIcons(icon);
  });
}
