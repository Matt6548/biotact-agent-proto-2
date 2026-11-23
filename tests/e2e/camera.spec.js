import { test, expect } from "@playwright/test";

test("fake webcam initializes private pose runtime and the correct renderer mode",async({page},testInfo)=>{
  test.setTimeout(75_000);
  const external=[];
  page.on("request",(request)=>{
    const url=new URL(request.url());
    if(url.protocol==="http:"||url.protocol==="https:"){
      if(url.origin!=="http://127.0.0.1:4173")external.push(request.url());
    }
  });

  await page.goto("/");
  // Browser CI may switch focus between Chromium workers. Test a visible tab,
  // because the app correctly releases the camera on visibility loss.
  await page.bringToFront();
  await expect.poll(()=>page.evaluate(()=>document.visibilityState)).toBe("visible");
  await page.getByRole("button",{name:"Начать упражнение"}).click();

  await expect(page.locator("#camera-status")).toContainText(/Pose model ready/i,{timeout:20000});
  await expect(page.getByRole("button",{name:"Пауза"})).toBeEnabled();
  await expect(page.locator("#setup-state")).toContainText(/кадр|движени|готов|камер|frame|body|motion/i);
  await expect(page.locator("#model-backend")).toHaveText(/GPU|CPU/i);
  await expect(page.locator("#inference-ms")).toHaveText(/\d+ ms/,{timeout:20000});
  await expect(page.locator("#busy-skips")).toHaveText(/^\d+$/);
  const cameraHasLiveTrack=()=>page.locator("#camera").evaluate(video=>Boolean(video.srcObject?.getVideoTracks().some(track=>track.readyState==="live")));
  await expect.poll(cameraHasLiveTrack).toBe(true);

  expect(external).toEqual([]);

  const mode=await page.locator("#camera-card").getAttribute("data-renderer-mode");
  expect(mode).toBe("full");
  if(testInfo.project.name==="camera-mobile-chromium"){
    const focusState=await page.evaluate(()=>{
      const state=(selector)=>{
        const el=document.querySelector(selector);
        if(!el)return{exists:false,display:null,visibility:null};
        const style=getComputedStyle(el);
        return{exists:true,display:style.display,visibility:style.visibility};
      };
      const stop=document.querySelector("#stop-camera");
      return{
        miniCanvasCount:document.querySelectorAll("#mini-target-canvas canvas").length,
        arenaPosition:getComputedStyle(document.querySelector(".arena-status")).position,
        hero:state(".hero"),
        target:state(".target-card"),
        history:state(".history-card"),
        fieldTest:state(".field-test"),
        simulation:state(".simulation"),
        camera:state(".camera-card"),
        frameGuide:state(".frame-guide"),
        cameraStatus:state("#camera-status"),
        stop:{
          scrollWidth:stop?.scrollWidth??0,
          clientWidth:stop?.clientWidth??0,
          whiteSpace:stop?getComputedStyle(stop).whiteSpace:null,
        },
      };
    });

    expect(focusState.miniCanvasCount).toBe(0);
    expect(focusState.arenaPosition).not.toBe("sticky");
    for(const key of["hero","target"]){
      expect(focusState[key].display).not.toBe("none");
    }
    expect(focusState.camera.exists).toBe(true);
    expect(focusState.camera.display).not.toBe("none");
    expect(focusState.frameGuide.exists).toBe(true);
    expect(focusState.cameraStatus.exists).toBe(true);
    expect(focusState.cameraStatus.display).not.toBe("none");
    expect(focusState.stop.whiteSpace).toBe("nowrap");
    expect(focusState.stop.scrollWidth).toBeLessThanOrEqual(focusState.stop.clientWidth+1);

    await expect(page.locator(".target-card")).toBeVisible();
    const mobileLayout=await page.evaluate(()=>{
      const bounds=(selector)=>{
        const {left,right,top,bottom,width,height}=document.querySelector(selector).getBoundingClientRect();
        return{left,right,top,bottom,width,height};
      };
      return{
        scene:bounds(".scene"),
        camera:bounds(".camera-card"),
        video:bounds("#camera-stage"),
        pageWidth:document.documentElement.scrollWidth,
        viewportWidth:document.documentElement.clientWidth,
      };
    });
    // The camera is an accessible setup panel *after* the candle, not a
    // picture-in-picture overlay hiding the virtual flame.
    expect(mobileLayout.camera.top).toBeGreaterThanOrEqual(mobileLayout.scene.bottom-2);
    expect(mobileLayout.camera.left).toBeGreaterThanOrEqual(-2);
    expect(mobileLayout.camera.right).toBeLessThanOrEqual(mobileLayout.viewportWidth+2);
    expect(mobileLayout.scene.height).toBeGreaterThan(260);
    expect(mobileLayout.video.width).toBeGreaterThan(100);
    expect(mobileLayout.video.height).toBeGreaterThan(70);
    expect(mobileLayout.pageWidth).toBeLessThanOrEqual(mobileLayout.viewportWidth+1);
    await page.getByRole("button",{name:"Настроить камеру"}).click();
    await expect(page.locator(".camera-card")).toBeInViewport({timeout:5000});
    await page.getByRole("button",{name:"Пауза"}).click();
    await expect(page.getByRole("button",{name:"Продолжить"})).toBeEnabled();
    await expect.poll(cameraHasLiveTrack).toBe(false);
    await expect(page.locator("#practice-status")).toContainText("камера выключена");
    await page.getByRole("button",{name:"Продолжить"}).click();
    await expect(page.getByRole("button",{name:"Пауза"})).toBeEnabled();
    await expect.poll(cameraHasLiveTrack).toBe(true);
    await page.screenshot({path:testInfo.outputPath("04-mobile-free-practice.png")});
    await page.getByRole("button",{name:"Завершить"}).click();
    await expect.poll(cameraHasLiveTrack).toBe(false);
    await expect(page.getByRole("button",{name:"Начать упражнение"})).toBeEnabled();
  }else{
    await expect(page.locator("#mini-target-canvas canvas")).toHaveCount(0);
    await expect(page.locator(".hero")).toBeVisible();
    await expect(page.locator(".target-card")).toBeVisible();
  }
});


test("fake webcam produces an aggregate device-readiness report",async({page},testInfo)=>{
  test.skip(testInfo.project.name!=="camera-chromium","One real fake-camera integration path is sufficient; mobile readiness math is covered by the same runtime plus unit tests.");
  test.setTimeout(60_000);

  const external=[];
  page.on("request",(request)=>{
    const url=new URL(request.url());
    if((url.protocol==="http:"||url.protocol==="https:")&&url.origin!=="http://127.0.0.1:4173"){
      external.push(request.url());
    }
  });

  await page.goto("/");
  await page.getByRole("button",{name:"Начать упражнение"}).click();
  await expect(page.locator("#camera-status")).toContainText(/Pose model ready/i,{timeout:20000});
  await expect(page.locator("#inference-ms")).toHaveText(/\d+ ms/,{timeout:20000});
  await expect(page.locator("#device-readiness")).toHaveText(/Готово|Нагрузка повышена|Устройство ограничено/,{timeout:40000});
  await expect(page.locator("#device-report-export")).toBeEnabled();

  expect(external).toEqual([]);
});
