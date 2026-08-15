import { reactive } from "vue";

const store = reactive({
    dark: false,
    themeChange: false,
    fontSize: "",
    fontFamily: "",
    lineHeight: "",
    popupSearch: true,
    searchPinned: false,
    todayDue: 0,
    todayNew: 0,
    streak: 0,
});

export default store;