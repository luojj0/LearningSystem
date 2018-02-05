﻿$(function () {
    OtherLogin.init();
    courseOver(); //课程列表中的事件
    loginLoyoutSet(); //登录初始界面设置
    Event_init();
    //当提交时，按钮进入预载状态
    setInterval(function () {
        var obj = $("*[disabled=disabled]");
        if (obj.size() < 1) return;
        var vtxt = obj.val();
        var ltxt = obj.attr("loading-txt");
        if (vtxt.indexOf(".") < 0) {
            obj.val(ltxt + ".");
        } else {
            var tm = vtxt.substring(vtxt.indexOf("."));
            obj.val(tm.length < 3 ? vtxt + "." : ltxt);
        }
    }, 200);
    //当短信发送后，倒计时数秒
    setInterval(_mobiLogin_smsSendWaiting, 1000);
});

//设置登录框的布局
function loginLoyoutSet() {
    var loyout = $().getPara("loyout");
    var obj = loyout == "mobile" ? $(".loginBar>div:last") : $(".loginBar>div:first");
    //标题的标示与隐藏
    $(".loginBar>div").attr("class", "loginTitle");
    obj.attr("class", "loginTitleCurr");
    obj.find("a").click(function () { return false; });
    //登录区域的显示与隐藏
    $(".loginArea").hide();
    var tag = obj.attr("tag");
    var curr = $(".loginArea[tag=" + tag + "]");
    curr.show();
}
//当课程信息，鼠标滑过时
function courseOver() {
    $(".courseList .item").hover(function () {
        $(this).addClass("courseOver");
        $(this).find(".itemMark").animate({ top: -142 });
        $(this).find(".itemInfo").animate({ top: -135 * 2 });
    }, function () {
        $(this).removeClass("courseOver");
        $(this).find(".itemMark").animate({ top: -45 });
        $(this).find(".itemInfo").animate({ top: -135 - 45 });
    });
}
/*
*
*  登录相关事件与方法
*
*/
//事件初始始化
function Event_init() {
    //登录事件
    $("form").submit(function () {
        try {
            var name = $(this).attr("name");
            var func = eval("Event_" + name);
            var btn = $(this).find("input[type=submit][name=btnSubmit]");
            btn.attr("loading-txt", "正在登录").attr("disabled", "disabled").addClass("disabled");
            //提交的地址
            var url = window.location.href;
            url = url.indexOf("?") > -1 ? url.substring(0, url.lastIndexOf("?")) : url;
            func($(this), url);
        } catch (e) {
            alert("error:" + e.message);
        }
        return false;
    });
    //获取验证短信
    $("#getSms").click(_mobiLogin_smsSend);
}
//账号登录
function Event_accLogin(form, url) {
    //先验证验证码
    var vname = form.find("img.verifyCode").attr("src");
    var rs = new RegExp("(^|)name=([^\&]*)(\&|$)", "gi").exec(vname), tmp;
    vname = tmp = rs ? rs[2] : "";
    $.post(url, { action: "accloginvcode", vcode: form.find("input[name=tbCode]").val(), vname: vname }, function (requestdata) {
        var data = eval("(" + requestdata + ")");
        if (Number(data.success) < 1) {
            Verify.ShowBox(form.find("input[name=tbCode]"), "验证码不正确！");
            var btn = form.find("input[type=submit][name=btnSubmit]");
            btn.val("登录").removeAttr("disabled", "disabled").removeClass("disabled");
        } else {
            //提交验证账号与密码
            var acc = form.find("input[name=tbAcc]").val();
            var pw = form.find("input[name=tbPw]").val();
            var sign = form.find("input[name=cbSign]").val(); 	//是否免登录
            var signnum = form.find("input[name=signnum]").val(); //免登录的时效
            $.post(url, { action: "acclogin", acc: acc, pw: pw, sign: sign, signnum: signnum }, function (requestdata) {
                var data = eval("(" + requestdata + ")");
                if (Number(data.success) < 1) {
                    Verify.ShowBox(form.find("input[name=tbPw]"), "密码不正确！");
                    form.find("img.verifyCode").click();
                    var btn = form.find("input[type=submit][name=btnSubmit]");
                    btn.val("登录").removeAttr("disabled", "disabled").removeClass("disabled");
                } else {
                    $().cookie("sharekeyid", data.acid);
                    $.storage("sharekeyid", data.acid);
                    var txt = "亲爱的 <b>" + data.name + "</b>，您已经成功登录。<br/><br/>将在<second>5</second>秒后将返回来源页。";
                    var msg = new MsgBox("登录成功", txt, 400, 200, "msg");
                    msg.ShowCloseBtn = false;
                    msg.ShowCloseBtn = false;
                    MsgBox.OverEvent = function () {
                        var href = form.find("input[name=from]").val();
                        window.location.href = $().setPara(href, "sharekeyid", data.acid);
                    };
                    msg.Open();
                }
            });
        }
    });
    return false;
}


//手机验证登录
function Event_mobiLogin(form, url) {
    //登录验证
    _mobiLogin_veri(form, url);
}
//短信发送
function _mobiLogin_smsSend() {
    if (Number($(this).attr("num")) > 0) return;
    if (!Verify.IsPass($("form[name=mobiLogin]"), "getsms")) return;
    var vcode = $("form[name=mobiLogin]").find("input[type=text][name=tbCode]").val();
    //先验证验证码
    var vname = $("form[name=mobiLogin] img.verifyCode").attr("src");
    var rs = new RegExp("(^|)name=([^\&]*)(\&|$)", "gi").exec(vname), tmp;
    vname = tmp = rs ? rs[2] : "";
    var phone = $("form[name=mobiLogin] input[name=tbPhone]").val(); //手机号
    $("#getSms").attr("state", "waiting").text("验证中...").css("cursor", "default");
    $.post(window.location.href, { action: "getSms", vcode: vcode, vname: vname, phone: phone }, function (requestdata) {
        var data = eval("(" + requestdata + ")");
        var state = Number(data.state); //状态值
        if (Number(data.success) < 1) {
            //不成功
            if (state == 1) Verify.ShowBox($("form[name=mobiLogin]").find("input[type=text][name=tbCode]"), "验证码不正确！");
            if (state == 2) Verify.ShowBox($("form[name=mobiLogin]").find("input[type=text][name=tbPhone]"), "手机号不存在！");
            if (state == 3) {
                var txt = "短信发送失败，请与管理员联系。<br/><br/>可能原因：<br/>1、短信接口未开放，或设置不正确。<br/>2、短信账户余额不足。";
                txt += "<br/><br/>详情：" + data.desc;
                new MsgBox("发送失败", txt, 400, 250, "alert").Open();
            }
        } else {
            if (state == 0) {
                $("#getSms").attr("state", "waiting").attr("num", 60).css("cursor", "default");
                $("#getSms").attr("send", "true"); //表示已经发送过
            }
        }
    });
}
//短信发送后的等待效果
function _mobiLogin_smsSendWaiting() {
    var obj = $("*[state=waiting]");
    if (obj.size() < 1) return;
    var num = Number(obj.attr("num"));
    var ltxt = obj.attr("waiting");
    if (num > 0) {
        obj.text(ltxt.replace("{num}", num--));
        obj.attr("num", num);
    } else {
        obj.text("获取短信");
    }
}
//手机号登录的验证
function _mobiLogin_veri(form, url) {
    //先验证验证码
    var vname = form.find("img.verifyCode").attr("src");
    var rs = new RegExp("(^|)name=([^\&]*)(\&|$)", "gi").exec(vname), tmp;
    vname = tmp = rs ? rs[2] : "";
    var phone = form.find("input[name=tbPhone]").val(); //手机号
    var sms = form.find("input[name=tbSms]").val(); //用户填写的短信验证码
    var sign = form.find("input[name=cbSign]").val(); 	//是否免登录
    var signnum = form.find("input[name=signnum]").val(); //免登录的时效
    $.post(url, { action: "mobilogin",
        vcode: form.find("input[name=tbCode]").val(),
        vname: vname,
        phone: phone,
        sms: sms,
        sign: sign,
        signnum: signnum
    },
	function (requestdata) {
	    var data = eval("(" + requestdata + ")");
	    var state = Number(data.state); //状态值
	    if (Number(data.success) < 1) {
	        if (state == 1) Verify.ShowBox($("form[name=mobiLogin]").find("input[type=text][name=tbCode]"), "验证码不正确！");
	        if (state == 3) Verify.ShowBox($("form[name=mobiLogin]").find("input[type=text][name=tbSms]"), "验证码不正确！");
	        form.find("img.verifyCode").click();
	        var btn = form.find("input[type=submit][name=btnSubmit]");
	        btn.val("登录").removeAttr("disabled", "disabled").removeClass("disabled");
	    } else {
	        $().cookie("sharekeyid", data.acid);
	        $.storage("sharekeyid", data.acid);
	        var txt = "亲爱的 <b>" + data.name + "</b>，您已经成功登录。<br/><br/>将在<second>5</second>秒后将返回来源页。";
	        var msg = new MsgBox("登录成功", txt, 400, 200, "msg");
	        msg.ShowCloseBtn = false;
	        msg.ShowCloseBtn = false;
	        MsgBox.OverEvent = function () {
	            var href = form.find("input[name=from]").val();
	            window.location.href = $().setPara(href, "sharekeyid", data.acid);
	        };
	        msg.Open();
	    }
	});
}
/*第三方登录*/
function OtherLogin() { }
OtherLogin.init = function () {
    $("a[tag=qqlogin]").click(function () {
        var appid = $(this).attr("appid"); //appid
        var returl = OtherLogin.prefix($(this).attr("returl")) + "/qqlogin.ashx"; //回调域
        var orgid = $(this).attr("orgid"); 	//当前机构id
        var target = "https://graph.qq.com/oauth2.0/authorize?client_id=" + appid + "&response_type=code&scope=all&state=" + orgid + "&redirect_uri=" + returl;
        var msg = new PageBox("QQ登录", target, 640, 480, "qqlogin-" + orgid);
        msg.Open();
    });
    $("a[tag=weixinlogin]").click(function () {
        var appid = $(this).attr("appid"); //appid
        var returl = OtherLogin.prefix($(this).attr("returl")) + "/weixinlogin.ashx"; //回调域
        var orgid = $(this).attr("orgid"); 	//当前机构id
        var target = "https://open.weixin.qq.com/connect/qrconnect?";
        target += "appid=" + appid + "&redirect_uri=" + encodeURIComponent(returl) + "&response_type=code&scope=snsapi_login&state=" +
			orgid + "&&style=black#wechat_redirect";
        var msg = new PageBox("微信登录", target, 640, 480, "qqlogin-" + orgid);
        msg.Open();
    });
}
//获取前缀，主要用来判断是http还是https
OtherLogin.prefix = function (returl) {
    var arr = "http://|https://".split("|");
    var ispass = false;
    for (var t in arr) {
        if (arr[t].length > returl.length) continue;
        if (returl.indexOf(arr[t]) == 0) {
            ispass = true;
            break;
        }
    }
    return !ispass ? "http://" + returl : returl;
}