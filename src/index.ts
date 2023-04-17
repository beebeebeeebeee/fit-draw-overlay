import * as fs from 'fs'
import FitParser from 'fit-file-parser-typescript'
import {createCanvas, loadImage, CanvasRenderingContext2D} from "canvas";

const FIT_FILE = 'input/Tai_Mo_Shan_Mini_Trail_Recce.fit'
const icons = {
    RUN: 'src/assets/icon_run.svg'
}
const OUTPUT_FILE = 'output/overlay.png'

const fitParser = new FitParser({
    force: true,
    speedUnit: 'km/h',
    lengthUnit: 'km',
    temperatureUnit: 'kelvin',
    elapsedRecordField: true,
    mode: 'list',
});

async function main() {
    const {records}: any = await new Promise(async (resolve, reject) => {
        fitParser.parse(await fs.readFileSync(FIT_FILE), (error, data) => {
            if (error) {
                reject(error)
            }
            resolve(data)
        })
    })

    const width = 1920
    const height = 1080

    const canvas = createCanvas(width, height)
    const ctx = canvas.getContext('2d')

    const progressTime = new Date('2023-04-02T03:22:26.000Z')
    await drawGpx({
        ctx: ctx,
        width: width,
        height: height,
        records: records,
        progressTime: progressTime,
    })

    await fs.writeFileSync(OUTPUT_FILE, canvas.toBuffer())
}

async function drawGpx(props: {
    ctx: CanvasRenderingContext2D;
    width: number;
    height: number;
    records: any[];
    progressTime: Date;
}) {
    const {ctx, width, height, records, progressTime} = props

    // canvas position and size calculation
    const gpxWidth = width / 5
    const gpxHeight = height / 5
    const gpxOffsetX = width - gpxWidth - width / 24
    const gpxOffsetY = height / 24

    const {gpxMinX, gpxMaxX, gpxMinY, gpxMaxY} = records.reduce((pv, cv) => {
        const {position_lat: lat, position_long: long} = cv
        if (lat == null || long == null) {
            return pv
        }
        return {
            gpxMinX: pv.gpxMinX == 0 || long < pv.gpxMinX ? long : pv.gpxMinX,
            gpxMaxX: pv.gpxMaxX == 0 || long > pv.gpxMaxX ? long : pv.gpxMaxX,
            gpxMinY: pv.gpxMinY == 0 || lat < pv.gpxMinY ? lat : pv.gpxMinY,
            gpxMaxY: pv.gpxMaxY == 0 || lat > pv.gpxMaxY ? lat : pv.gpxMaxY,
        }
    }, {
        gpxMinX: 0,
        gpxMaxX: 0,
        gpxMinY: 0,
        gpxMaxY: 0,
    })

    const gpxDiffX = gpxMaxX - gpxMinX
    const gpxDiffY = gpxMaxY - gpxMinY
    const gpxRatio = gpxDiffX > gpxDiffY ? gpxWidth / gpxDiffX : gpxHeight / gpxDiffY

    const getXY = (lat: number, long: number) => ({
        x: (long - gpxMinX) * gpxRatio + gpxOffsetX,
        y: (gpxMaxY - lat) * gpxRatio + gpxOffsetY
    })

    // draw background line
    ctx.beginPath()
    ctx.strokeStyle = '#FF0000'
    for (const each of records) {
        const {position_lat: lat, position_long: long} = each
        if (lat == null || long == null) {
            continue
        }
        const {x, y} = getXY(lat, long)
        ctx.lineTo(x, y)
    }
    ctx.stroke()

    // draw foreground line
    ctx.beginPath()
    ctx.strokeStyle = '#003cff'
    let x, y
    for (const each of records) {
        const {position_lat: lat, position_long: long} = each
        if (+each.timestamp > +progressTime) {
            break
        }
        if (lat == null || long == null) {
            continue
        }
        const xy = getXY(lat, long)
        x = xy.x
        y = xy.y
        ctx.lineTo(x, y)
    }
    ctx.stroke()

    // draw icon
    const iconWidth = width / 48
    ctx.drawImage(await loadImage(icons.RUN), x - iconWidth / 2, y - iconWidth / 2, iconWidth, iconWidth)
}

void main()