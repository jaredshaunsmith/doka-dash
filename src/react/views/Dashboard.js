import Nav from '../components/Nav/Nav'
const Dashboard = ({
    times
}) => {
    return (
        <div style={{ width: '100vw', height: '100vh', position: 'fixed', top: '0', zIndex: '99', background: 'var(--color-surface)', display: 'flex'}}>
            <Nav currHours={times.currHours} currMinutes={times.currMinutes} currSeconds={times.currSeconds} />
        </div>
    )
}

export default Dashboard