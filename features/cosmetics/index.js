/// <reference types="../../../CTAutocomplete" />
/// <reference lib="es2015" />
import Feature from "../../featureClass/class";
import DragonWings from "./cosmetic/dragon/dragonWings"
import Toggle from "../settings/settingThings/toggle"
const Essential = Java.type("gg.essential.Essential")
const EssentialCosmeticSlot = Java.type("gg.essential.cosmetics.CosmeticSlot")

class Cosmetics extends Feature {
    constructor() {
        super()
    }

    onEnable(){
        this.initVariables()
        this.loadedCosmetics = []
        this.uuidToCosmetic = {}

        this.cosmeticsData = {}

        this.playerHasACosmeticA = false

        this.firstPersonVisable = new Toggle("Cosmetics visable in first person", "", false, "cosmetics_first_person_visable", this)
        this.lessFirstPersonVisable = new Toggle("Make cosmetics less visable in first person mode", "", true, "cosmetics_first_person_less_visable", this).requires(this.firstPersonVisable)

        this.loadCosmeticsData()

        this.worldLoad()

        this.registerEvent("tick", this.tick)
        this.registerEvent("renderWorld", this.renderWorld)
        this.registerEvent("playerJoined", this.playerJoined)
        this.registerEvent("playerLeft", this.playerLeft)
        this.registerEvent("worldLoad", this.worldLoad)
        this.registerStep(false, 5, this.step)
        this.registerStep(false, 60*10, ()=>{
            new Thread(()=>{this.loadCosmeticsData.call(this)}).start()
        })
    }

    loadCosmeticsData(){
        let data = JSON.parse(FileLib.getUrlContent("http://soopymc.my.to/api/soopyv2/cosmetics.json"))

        this.cosmeticsData = data
        this.playerHasACosmeticA = !!data[Player.getUUID().toString().replace(/-/g,"")]

        this.scanForNewCosmetics()
    }

    setUserCosmeticsInformation(uuid, cosmetics){
        if(!this.enabled) return
        
        this.loadedCosmetics = this.loadedCosmetics.filter(cosmetic=>{
            if(cosmetic.player.getUUID().toString().replace(/-/g,"") === uuid){
                this.uuidToCosmetic[cosmetic.player.getUUID().toString().replace(/-/g,"")] = undefined
                return false
            }
            return true
        })

        if(!cosmetics){
            delete this.cosmeticsData[uuid]
            return
        }
        this.cosmeticsData[uuid] = cosmetics
        this.scanForNewCosmetics()
    }

    step(){
        this.scanForNewCosmetics()
    }
    scanForNewCosmetics(){
            
        if(!this.uuidToCosmetic[Player.getUUID().toString().replace(/-/g,"")] && this.shouldPlayerHaveCosmetic(Player, "dragon_wings")){
            let cosmetic = new DragonWings(Player, this)
            this.loadedCosmetics.push(cosmetic)
            this.uuidToCosmetic[Player.getUUID().toString().replace(/-/g,"")] = cosmetic
        }
        
        World.getAllPlayers().forEach(p=>{
            if(p.getUUID().toString().replace(/-/g,"") === Player.getUUID().toString().replace(/-/g,"") || this.uuidToCosmetic[p.getUUID().toString().replace(/-/g,"")]) return
            if(this.shouldPlayerHaveCosmetic(p, "dragon_wings")){
                let cosmetic = new DragonWings(p, this)
                this.loadedCosmetics.push(cosmetic)
                this.uuidToCosmetic[p.getUUID().toString().replace(/-/g,"")] = cosmetic
            }
        })
    }

    worldLoad(){
        this.loadedCosmetics = []
        this.uuidToCosmetic = {}

        if(this.shouldPlayerHaveCosmetic(Player, "dragon_wings") && !this.uuidToCosmetic[Player.getUUID().toString().replace(/-/g,"")]){
            let cosmetic = new DragonWings(Player, this)
            this.loadedCosmetics.push(cosmetic)
            this.uuidToCosmetic[Player.getUUID().toString().replace(/-/g,"")] = cosmetic
        }
        
        World.getAllPlayers().forEach(p=>{
            if(p.getUUID().toString().replace(/-/g,"") === Player.getUUID().toString().replace(/-/g,"")) return
            if(this.shouldPlayerHaveCosmetic(p, "dragon_wings") && !this.uuidToCosmetic[p.getUUID().toString().replace(/-/g,"")]){
                let cosmetic = new DragonWings(p, this)
                this.loadedCosmetics.push(cosmetic)
                this.uuidToCosmetic[p.getUUID().toString().replace(/-/g,"")] = cosmetic
            }
        })
    }

    playerJoined(player){
        if(player.getUUID().toString().replace(/-/g,"") === Player.getUUID().toString().replace(/-/g,"")) return
        
        if(this.shouldPlayerHaveCosmetic(player, "dragon_wings") && !this.uuidToCosmetic[player.getUUID().toString().replace(/-/g,"")]){
            let cosmetic = new DragonWings(player, this)
            this.playerHasACosmeticA = true
            this.loadedCosmetics.push(cosmetic)
            this.uuidToCosmetic[player.getUUID().toString().replace(/-/g,"")] = cosmetic
        }
    }

    playerLeft(playerName){
        this.loadedCosmetics.filter(cosmetic=>{
            if(cosmetic.player.getName() === playerName){
                this.uuidToCosmetic[cosmetic.player.getUUID().toString().replace(/-/g,"")] = undefined
                return false
            }
            return true
        })
    }

    shouldPlayerHaveCosmetic(player, cosmetic){
        if(!!this.cosmeticsData[player.getUUID().toString().replace(/-/g,"")]?.[cosmetic]){
            if(!this.getPlayerCosmeticSettings(player, cosmetic).enabled) return false
            return true
        }
        return false
    }
    getPlayerCosmeticSettings(player, cosmetic){
        return this.cosmeticsData[player.getUUID().toString().replace(/-/g,"")]?.[cosmetic]
    }

    filterUnloadedCosmetics(tick){
        this.loadedCosmetics = this.loadedCosmetics.filter(cosmetic => {
            if(tick) cosmetic.onTick()
            if(cosmetic.player.getPlayer().field_70128_L){  //filter out players that are no longer loaded
                this.uuidToCosmetic[cosmetic.player.getUUID().toString().replace(/-/g,"")] = undefined
                return false
            }
            return true
        })
    }

    tick(){
        this.restoreEssentialCosmetics()

        this.filterUnloadedCosmetics(true)
    }

    restoreEssentialCosmetics(){
        World.getAllPlayers().forEach(p=>{
            if(!p.getPlayer().getEssentialCosmetics()) return
            
            let wingCosmetic = p.getPlayer().getEssentialCosmetics().get(EssentialCosmeticSlot.WINGS)
            if(wingCosmetic !== null){
                p.getPlayer().getEssentialCosmeticModels().get(Essential.instance.getConnectionManager().getCosmeticsManager().getCosmetic(wingCosmetic)).getModel().getModel().boneList.forEach(b=>{
                    b.isHidden = false
                })
            }else{
                let fullBodyCosmetic = p.getPlayer().getEssentialCosmetics().get(EssentialCosmeticSlot.FULL_BODY)
                if(fullBodyCosmetic === "DRAGON_ONESIE_2"){
                    p.getPlayer().getEssentialCosmeticModels().get(Essential.instance.getConnectionManager().getCosmeticsManager().getCosmetic(fullBodyCosmetic)).getModel().getModel().boneList.forEach(b=>{
                        if(b.boxName === "wing_left_1" || b.boxName === "wing_right_1")b.isHidden = false
                    })
                }
            }
        })
    }

    renderWorld(ticks){
        this.loadedCosmetics.forEach(cosmetic => {
            cosmetic.onRender(ticks)
        })
    }

    initVariables(){
        this.loadedCosmetics = undefined
        this.uuidToCosmetic = undefined
        this.playerHasACosmeticA = undefined
        this.cosmeticsData = undefined
    }

    onDisable(){
        this.restoreEssentialCosmetics()

        this.initVariables()
    }
}

module.exports = {
    class: new Cosmetics()
}