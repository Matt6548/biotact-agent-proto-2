import { test, expect } from "@playwright/test";

async function completeBriefing(page,name="Test Player"){
  await expect(page.getByRole("dialog",{name:"Candle Strike"})).toBeVisible();
  await page.locator("#player-name-input").fill(name);
  await page.locator("#safety-ack").check();
  await expect(page.getByRole("button",{name:"Enter training"})).toBeEnabled();
  await page.getByRole("button",{name:"Enter training"}).click();
  await expect(page.locator("#mission-gate")).toBeHidden();
}



test("fake webcam initializes private pose runtime and the correct renderer mode",async({page},testInfo)=>{
  test.setTimeout(45_000);
  const external=[];
  page.on("request",(request)=>{
    const url=new URL(request.url());
    if(url.protocol==="http:"||url.protocol==="https:"){
      if(url.origin!=="http://127.0.0.1:4173")external.push(request.url());
    }
  });

  await page.goto("/");
  await completeBriefing(page);
  await page.getByRole("button",{name:"Start training"}).click();

  await expect(page.locator("#camera-status")).toContainText(/Pose model ready/i,{timeout:20000});
  const frameAction=page.getByRole("button",{name:"Step into frame"});
  await expect(frameAction).toBeVisible();
  await expect(frameAction).toBeDisabled();
  await expect(page.locator("#setup-state")).toContainText(/frame|body|camera/i);
  await expect(page.locator("#model-backend")).toHaveText(/GPU|CPU/i);
  await expect(page.locator("#inference-ms")).toHaveText(/\d+ ms/,{timeout:20000});
  await expect(page.locator("#busy-skips")).toHaveText(/^\d+$/);

  expect(external).toEqual([]);

  const mode=await page.locator("#camera-card").getAttribute("data-renderer-mode");
  if(testInfo.project.name==="camera-mobile-chromium"){
    expect(mode).toBe("mini");
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

    expect(focusState.miniCanvasCount).toBe(1);
    expect(focusState.arenaPosition).toBe("sticky");
    for(const key of["hero","target","history","fieldTest","simulation"]){
      expect(focusState[key].exists).toBe(true);
      expect(focusState[key].display).toBe("none");
    }
    expect(focusState.camera.exists).toBe(true);
    expect(focusState.camera.display).not.toBe("none");
    expect(focusState.frameGuide.exists).toBe(true);
    expect(focusState.frameGuide.display).not.toBe("none");
    expect(focusState.cameraStatus.exists).toBe(true);
    expect(focusState.cameraStatus.display).toBe("none");
    expect(focusState.stop.whiteSpace).toBe("nowrap");
    expect(focusState.stop.scrollWidth).toBeLessThanOrEqual(focusState.stop.clientWidth+1);

    await page.screenshot({
      path:testInfo.outputPath("04-mobile-live-focus.png")
    });
  }else{
    expect(mode).toBe("full");
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
  await completeBriefing(page);
  await page.getByRole("button",{name:"Start training"}).click();
  await expect(page.locator("#camera-status")).toContainText(/Pose model ready/i,{timeout:20000});
  await expect(page.locator("#inference-ms")).toHaveText(/\d+ ms/,{timeout:20000});
  await expect(page.locator("#device-readiness")).toHaveText(/Ready|Constrained|Limited/,{timeout:40000});
  await expect(page.locator("#device-report-export")).toBeEnabled();

  expect(external).toEqual([]);
});
